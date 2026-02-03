"""
Dataset Service for NL-to-Insights

Handles file upload, schema management, and data preview.
Uses SQLAlchemy repositories for data persistence.
"""

import os
import logging
from datetime import datetime
from typing import Optional, List, Tuple
from uuid import UUID
import pandas as pd

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.repositories.insights import (
    InsightsDatasetRepository,
    InsightsConversationRepository,
    InsightsQueryRepository,
)
from app.db.models.insights import InsightsDataset
from app.models.insights import (
    DataType,
    AggregationType,
    DatasetStatus,
    ColumnDefinition,
    SchemaDefinition,
    DatasetFileInfo,
    DatasetResponse,
    DatasetListResponse,
    DatasetPreviewResponse,
    ColumnUpdate,
    ColumnSuggestion,
    SchemaInferenceResponse,
)

logger = logging.getLogger(__name__)

# Insights dataset storage directory
INSIGHTS_UPLOAD_DIR = os.path.join(settings.UPLOAD_DIR, "insights_datasets")
os.makedirs(INSIGHTS_UPLOAD_DIR, exist_ok=True)


class DatasetService:
    """Service for managing datasets using SQLAlchemy repositories."""

    def __init__(self, session: AsyncSession):
        """Initialize service with database session."""
        self.session = session
        self.dataset_repo = InsightsDatasetRepository(session)
        self.conversation_repo = InsightsConversationRepository(session)
        self.query_repo = InsightsQueryRepository(session)

    @staticmethod
    def _validate_parquet_path(parquet_path: str) -> bool:
        """
        Validate parquet path is within allowed directory to prevent path traversal.

        Security: Prevents attackers from accessing files outside INSIGHTS_UPLOAD_DIR
        by manipulating stored paths in the database.
        """
        if not parquet_path:
            return False
        try:
            # Normalize and resolve the path to handle .. and symlinks
            abs_path = os.path.abspath(os.path.normpath(parquet_path))
            abs_upload_dir = os.path.abspath(os.path.normpath(INSIGHTS_UPLOAD_DIR))
            # Ensure the path is within the allowed directory
            return abs_path.startswith(abs_upload_dir + os.sep) or abs_path == abs_upload_dir
        except Exception:
            return False

    @staticmethod
    def _infer_dtype(series: pd.Series) -> DataType:
        """Infer data type from pandas series."""
        dtype = series.dtype

        if pd.api.types.is_integer_dtype(dtype):
            return DataType.INTEGER
        elif pd.api.types.is_float_dtype(dtype):
            return DataType.FLOAT
        elif pd.api.types.is_bool_dtype(dtype):
            return DataType.BOOLEAN
        elif pd.api.types.is_datetime64_any_dtype(dtype):
            return DataType.DATETIME
        else:
            # Try to parse as datetime
            try:
                non_null = series.dropna()
                if len(non_null) > 0:
                    pd.to_datetime(non_null.head(100))
                    return DataType.DATETIME
            except Exception:
                pass
            return DataType.STRING

    @staticmethod
    def _get_sample_values(series: pd.Series, max_samples: int = 5) -> List:
        """Get sample values from series."""
        non_null = series.dropna().head(max_samples)
        return [
            str(v) if pd.api.types.is_datetime64_any_dtype(series.dtype) else v
            for v in non_null.tolist()
        ]

    @staticmethod
    def _get_unique_values(series: pd.Series, max_unique: int = 50) -> Optional[List]:
        """Get unique values for categorical columns."""
        unique_count = series.nunique()
        if unique_count <= max_unique:
            return series.dropna().unique().tolist()
        return None

    @staticmethod
    def _suggest_aggregation(col_name: str, dtype: DataType) -> Optional[AggregationType]:
        """Suggest default aggregation based on column name and type."""
        name_lower = col_name.lower()

        # Count patterns
        if any(kw in name_lower for kw in ['count', 'quantity', 'qty', 'num', '数量']):
            return AggregationType.SUM

        # Sum patterns (money, amount)
        if any(kw in name_lower for kw in [
            'amount', 'total', 'sum', 'price', 'cost', 'revenue',
            'sales', '金额', '总额', '价格', '成本', '收入'
        ]):
            return AggregationType.SUM

        # Average patterns
        if any(kw in name_lower for kw in ['avg', 'average', 'mean', 'rate', '平均', '率']):
            return AggregationType.AVG

        # Default for numeric types
        if dtype in [DataType.INTEGER, DataType.FLOAT]:
            return AggregationType.SUM

        return None

    @staticmethod
    def _is_likely_metric(col_name: str, dtype: DataType, unique_ratio: float) -> bool:
        """Determine if column is likely a metric."""
        if dtype not in [DataType.INTEGER, DataType.FLOAT]:
            return False

        name_lower = col_name.lower()

        # Explicit metric patterns
        metric_keywords = [
            'amount', 'total', 'sum', 'price', 'cost', 'revenue', 'sales',
            'count', 'quantity', 'qty', '金额', '总额', '价格', '数量', '收入'
        ]
        if any(kw in name_lower for kw in metric_keywords):
            return True

        # High cardinality numeric = likely metric
        if unique_ratio > 0.5:
            return True

        return False

    @staticmethod
    def _is_likely_dimension(col_name: str, dtype: DataType, unique_ratio: float) -> bool:
        """Determine if column is likely a dimension."""
        name_lower = col_name.lower()

        # Explicit dimension patterns
        dimension_keywords = [
            'category', 'type', 'name', 'status', 'region', 'country',
            'city', 'department', 'product', '分类', '类型', '名称', '状态'
        ]
        if any(kw in name_lower for kw in dimension_keywords):
            return True

        # Date/time columns are dimensions
        if dtype == DataType.DATETIME:
            return True

        # Low cardinality = likely dimension
        if dtype == DataType.STRING and unique_ratio < 0.3:
            return True

        # ID columns are dimensions
        if 'id' in name_lower or '_id' in name_lower:
            return True

        return False

    async def upload_dataset(
        self,
        user_id: UUID,
        file_content: bytes,
        filename: str,
        name: str,
        description: Optional[str] = None
    ) -> Tuple[UUID, SchemaDefinition]:
        """
        Upload and process a dataset file (CSV/XLSX).

        Args:
            user_id: Owner user UUID
            file_content: Raw file bytes
            filename: Original filename
            name: Dataset name
            description: Optional description

        Returns:
            Tuple of (dataset_id, inferred_schema)
        """
        logger.info(f"Uploading dataset: {filename} for user {user_id}")

        # Determine file type
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext not in ['.csv', '.xlsx', '.xls']:
            raise ValueError(f"Unsupported file type: {file_ext}. Supported: CSV, XLSX")

        # Generate unique filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        safe_name = "".join(c if c.isalnum() else "_" for c in os.path.splitext(filename)[0])
        parquet_filename = f"{user_id}_{timestamp}_{safe_name}.parquet"
        parquet_path = os.path.join(INSIGHTS_UPLOAD_DIR, parquet_filename)

        # Read file into pandas
        try:
            if file_ext == '.csv':
                # Try different encodings
                for encoding in ['utf-8', 'gbk', 'gb2312', 'latin1']:
                    try:
                        df = pd.read_csv(
                            pd.io.common.BytesIO(file_content),
                            encoding=encoding
                        )
                        break
                    except UnicodeDecodeError:
                        continue
                else:
                    raise ValueError("Unable to decode CSV file with supported encodings")
            else:  # Excel
                df = pd.read_excel(pd.io.common.BytesIO(file_content))
        except Exception as e:
            logger.error(f"Failed to read file: {e}")
            raise ValueError(f"Failed to read file: {str(e)}")

        # Validate data
        if df.empty:
            raise ValueError("File is empty")

        if len(df.columns) == 0:
            raise ValueError("No columns found in file")

        row_count = len(df)
        logger.info(f"Loaded {row_count} rows, {len(df.columns)} columns")

        # Infer schema
        columns: List[ColumnDefinition] = []
        for col in df.columns:
            series = df[col]
            dtype = self._infer_dtype(series)
            unique_ratio = series.nunique() / len(series) if len(series) > 0 else 0

            col_def = ColumnDefinition(
                name=str(col),
                dtype=dtype,
                aliases=[],
                description=None,
                is_metric=self._is_likely_metric(str(col), dtype, unique_ratio),
                is_dimension=self._is_likely_dimension(str(col), dtype, unique_ratio),
                default_agg=self._suggest_aggregation(str(col), dtype),
                sample_values=self._get_sample_values(series),
                unique_values=self._get_unique_values(series) if dtype == DataType.STRING else None
            )
            columns.append(col_def)

        schema = SchemaDefinition(columns=columns)

        # Convert datetime columns for parquet compatibility
        for col in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[col].dtype):
                continue
            # Try to convert string columns that look like dates
            col_def = next((c for c in columns if c.name == col), None)
            if col_def and col_def.dtype == DataType.DATETIME:
                try:
                    df[col] = pd.to_datetime(df[col])
                except Exception:
                    pass

        # Save as parquet
        df.to_parquet(parquet_path, index=False)
        logger.info(f"Saved parquet file: {parquet_path}")

        # Create file info
        file_info = {
            "original_name": filename,
            "storage_path": parquet_path,
            "size_bytes": len(file_content),
            "row_count": row_count,
            "uploaded_at": datetime.utcnow().isoformat()
        }

        # Create dataset using repository
        dataset = await self.dataset_repo.create({
            "user_id": user_id,
            "name": name,
            "description": description,
            "file_info": file_info,
            "schema_definition": schema.model_dump(),
            "status": DatasetStatus.READY.value,
            "row_count": row_count,
            "error_message": None,
        })

        logger.info(f"Created dataset: {dataset.id}")
        return dataset.id, schema

    async def get_dataset(
        self,
        dataset_id: UUID,
        user_id: UUID
    ) -> Optional[InsightsDataset]:
        """Get dataset by ID for a specific user."""
        return await self.dataset_repo.get_by_id_and_user(dataset_id, user_id)

    async def list_datasets(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None
    ) -> DatasetListResponse:
        """List user's datasets with pagination."""
        datasets = await self.dataset_repo.get_by_user(user_id, status=status)

        # Manual pagination (repository returns all, we slice here)
        total = len(datasets)
        paginated = datasets[skip:skip + limit]

        # Convert to response models
        dataset_responses = []
        for ds in paginated:
            file_info = DatasetFileInfo(**ds.file_info)
            schema_def = SchemaDefinition(**ds.schema_definition)

            dataset_responses.append(DatasetResponse(
                id=str(ds.id),
                user_id=str(ds.user_id),
                name=ds.name,
                description=ds.description,
                file_info=file_info,
                schema_definition=schema_def,
                status=DatasetStatus(ds.status),
                row_count=ds.row_count,
                error_message=ds.error_message,
                created_at=ds.created_at,
                updated_at=ds.updated_at
            ))

        return DatasetListResponse(datasets=dataset_responses, total=total)

    async def update_schema(
        self,
        dataset_id: UUID,
        user_id: UUID,
        column_updates: List[ColumnUpdate]
    ) -> SchemaDefinition:
        """Update dataset schema with user-defined semantics."""
        dataset = await self.get_dataset(dataset_id, user_id)
        if not dataset:
            raise ValueError("Dataset not found")

        current_schema = SchemaDefinition(**dataset.schema_definition)

        # Create a map of updates by column name
        updates_map = {u.name: u for u in column_updates}

        # Apply updates to each column
        updated_columns = []
        for col in current_schema.columns:
            if col.name in updates_map:
                update = updates_map[col.name]
                col.aliases = update.aliases
                col.description = update.description
                col.is_metric = update.is_metric
                col.is_dimension = update.is_dimension
                col.default_agg = update.default_agg
            updated_columns.append(col)

        updated_schema = SchemaDefinition(columns=updated_columns)

        # Save to database using repository
        await self.dataset_repo.update(dataset_id, {
            "schema_definition": updated_schema.model_dump()
        })

        logger.info(f"Updated schema for dataset: {dataset_id}")
        return updated_schema

    async def get_preview(
        self,
        dataset_id: UUID,
        user_id: UUID,
        limit: int = 100,
        offset: int = 0
    ) -> DatasetPreviewResponse:
        """Get data preview from dataset."""
        dataset = await self.get_dataset(dataset_id, user_id)
        if not dataset:
            raise ValueError("Dataset not found")

        parquet_path = dataset.file_info.get("storage_path")

        # Security: Validate path is within allowed directory (prevent path traversal)
        if not self._validate_parquet_path(parquet_path):
            logger.warning(f"Path traversal attempt detected: {parquet_path}")
            raise ValueError("Invalid dataset path")

        if not os.path.exists(parquet_path):
            raise ValueError("Dataset file not found")

        # Read parquet with pandas
        df = pd.read_parquet(parquet_path)
        total_rows = len(df)

        # Apply offset and limit
        df_slice = df.iloc[offset:offset + limit]

        # Convert to response format
        columns = df_slice.columns.tolist()
        rows = df_slice.values.tolist()

        # Convert any numpy types to Python types
        rows = [
            [
                v.isoformat() if hasattr(v, 'isoformat') else
                (None if pd.isna(v) else v)
                for v in row
            ]
            for row in rows
        ]

        return DatasetPreviewResponse(
            columns=columns,
            rows=rows,
            total_rows=total_rows
        )

    async def delete_dataset(
        self,
        dataset_id: UUID,
        user_id: UUID
    ) -> bool:
        """Delete a dataset and its associated data."""
        dataset = await self.get_dataset(dataset_id, user_id)
        if not dataset:
            return False

        # Delete parquet file
        parquet_path = dataset.file_info.get("storage_path")
        # Security: Validate path before deletion (prevent path traversal)
        if self._validate_parquet_path(parquet_path) and os.path.exists(parquet_path):
            os.remove(parquet_path)
            logger.info(f"Deleted parquet file: {parquet_path}")
        elif parquet_path:
            logger.warning(f"Skipped deletion of invalid path: {parquet_path}")

        # Delete associated conversations (cascade will delete queries)
        conversations = await self.conversation_repo.get_by_dataset(dataset_id, user_id)
        for conv in conversations:
            await self.conversation_repo.delete(conv.id)

        # Delete dataset using repository
        result = await self.dataset_repo.delete(dataset_id)

        logger.info(f"Deleted dataset: {dataset_id}")
        return result

    async def infer_schema_semantics(
        self,
        dataset_id: UUID,
        user_id: UUID
    ) -> SchemaInferenceResponse:
        """Use rule-based inference to suggest semantic definitions for columns."""
        dataset = await self.get_dataset(dataset_id, user_id)
        if not dataset:
            raise ValueError("Dataset not found")

        current_schema = SchemaDefinition(**dataset.schema_definition)

        # For MVP, use rule-based inference
        # TODO: Add GPT-based inference in future
        suggestions = []
        for col in current_schema.columns:
            name_lower = col.name.lower()

            # Generate aliases based on column name
            aliases = []
            if 'amount' in name_lower or 'total' in name_lower:
                aliases.extend(['金额', '总额', '销售额'])
            elif 'date' in name_lower or 'time' in name_lower:
                aliases.extend(['日期', '时间'])
            elif 'product' in name_lower:
                aliases.extend(['产品', '商品'])
            elif 'customer' in name_lower:
                aliases.extend(['客户', '顾客'])
            elif 'category' in name_lower:
                aliases.extend(['分类', '类别'])

            # Generate description
            description = f"Column containing {col.dtype.value} data"
            if col.is_metric:
                description = "Numeric metric that can be aggregated"
            elif col.is_dimension:
                description = "Dimension for grouping and filtering"

            suggestion = ColumnSuggestion(
                name=col.name,
                inferred_type=col.dtype,
                suggested_aliases=aliases,
                suggested_description=description,
                is_likely_metric=col.is_metric,
                is_likely_dimension=col.is_dimension,
                suggested_agg=col.default_agg,
                confidence=0.7 if aliases else 0.5
            )
            suggestions.append(suggestion)

        return SchemaInferenceResponse(suggestions=suggestions)

    async def update_status(
        self,
        dataset_id: UUID,
        status: DatasetStatus,
        error_message: Optional[str] = None
    ) -> Optional[InsightsDataset]:
        """Update dataset status."""
        return await self.dataset_repo.update_status(dataset_id, status.value, error_message)
