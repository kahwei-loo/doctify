"""
Confidence Score Value Object

Represents confidence metrics for extracted data as immutable value objects.
"""

from dataclasses import dataclass
from typing import Dict, Any
from enum import Enum


class ConfidenceLevel(str, Enum):
    """Confidence level categories."""

    VERY_HIGH = "very_high"  # >= 0.9
    HIGH = "high"  # 0.75 - 0.89
    MEDIUM = "medium"  # 0.5 - 0.74
    LOW = "low"  # 0.25 - 0.49
    VERY_LOW = "very_low"  # < 0.25


@dataclass(frozen=True)
class ConfidenceScore:
    """
    Immutable confidence score.

    Represents confidence in extracted data (0.0 to 1.0 scale).
    """

    value: float

    def __post_init__(self):
        """Validate confidence score value."""
        if not isinstance(self.value, (int, float)):
            raise TypeError("Confidence value must be a number")

        if not 0.0 <= self.value <= 1.0:
            raise ValueError("Confidence value must be between 0.0 and 1.0")

    @classmethod
    def create(cls, value: float) -> "ConfidenceScore":
        """
        Factory method to create ConfidenceScore.

        Args:
            value: Confidence value (0.0 to 1.0)

        Returns:
            ConfidenceScore instance
        """
        return cls(value=float(value))

    @classmethod
    def from_percentage(cls, percentage: float) -> "ConfidenceScore":
        """
        Create from percentage value.

        Args:
            percentage: Percentage value (0 to 100)

        Returns:
            ConfidenceScore instance
        """
        if not 0.0 <= percentage <= 100.0:
            raise ValueError("Percentage must be between 0 and 100")

        return cls(value=percentage / 100.0)

    def get_level(self) -> ConfidenceLevel:
        """
        Get confidence level category.

        Returns:
            ConfidenceLevel enum
        """
        if self.value >= 0.9:
            return ConfidenceLevel.VERY_HIGH
        elif self.value >= 0.75:
            return ConfidenceLevel.HIGH
        elif self.value >= 0.5:
            return ConfidenceLevel.MEDIUM
        elif self.value >= 0.25:
            return ConfidenceLevel.LOW
        else:
            return ConfidenceLevel.VERY_LOW

    def is_acceptable(self, threshold: float = 0.75) -> bool:
        """
        Check if confidence score meets threshold.

        Args:
            threshold: Minimum acceptable confidence (default 0.75)

        Returns:
            True if score meets or exceeds threshold
        """
        return self.value >= threshold

    def to_percentage(self) -> float:
        """
        Convert to percentage.

        Returns:
            Percentage value (0 to 100), rounded to 2 decimals
        """
        return round(self.value * 100, 2)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "value": self.value,
            "percentage": self.to_percentage(),
            "level": self.get_level().value,
        }

    def __str__(self) -> str:
        return f"ConfidenceScore({self.to_percentage()}%, {self.get_level().value})"

    def __float__(self) -> float:
        return self.value

    def __lt__(self, other: "ConfidenceScore") -> bool:
        return self.value < other.value

    def __le__(self, other: "ConfidenceScore") -> bool:
        return self.value <= other.value

    def __gt__(self, other: "ConfidenceScore") -> bool:
        return self.value > other.value

    def __ge__(self, other: "ConfidenceScore") -> bool:
        return self.value >= other.value


@dataclass(frozen=True)
class FieldConfidence:
    """
    Immutable field confidence mapping.

    Maps field names to their confidence scores.
    """

    field_scores: Dict[str, ConfidenceScore]

    def __post_init__(self):
        """Validate field scores."""
        if not self.field_scores:
            raise ValueError("Field scores cannot be empty")

        for field_name, score in self.field_scores.items():
            if not isinstance(score, ConfidenceScore):
                raise TypeError(
                    f"Score for field '{field_name}' must be ConfidenceScore"
                )

    @classmethod
    def create(cls, field_scores: Dict[str, float]) -> "FieldConfidence":
        """
        Factory method to create FieldConfidence from float values.

        Args:
            field_scores: Dictionary mapping field names to confidence values

        Returns:
            FieldConfidence instance
        """
        confidence_scores = {
            field_name: ConfidenceScore.create(value)
            for field_name, value in field_scores.items()
        }
        return cls(field_scores=confidence_scores)

    def get_field_score(self, field_name: str) -> ConfidenceScore:
        """
        Get confidence score for a field.

        Args:
            field_name: Field name

        Returns:
            ConfidenceScore for the field

        Raises:
            KeyError: If field not found
        """
        return self.field_scores[field_name]

    def get_average_confidence(self) -> ConfidenceScore:
        """
        Calculate average confidence across all fields.

        Returns:
            Average ConfidenceScore
        """
        if not self.field_scores:
            return ConfidenceScore.create(0.0)

        total = sum(score.value for score in self.field_scores.values())
        average = total / len(self.field_scores)
        return ConfidenceScore.create(average)

    def get_lowest_confidence(self) -> ConfidenceScore:
        """
        Get the lowest confidence score.

        Returns:
            Lowest ConfidenceScore
        """
        return min(self.field_scores.values())

    def get_highest_confidence(self) -> ConfidenceScore:
        """
        Get the highest confidence score.

        Returns:
            Highest ConfidenceScore
        """
        return max(self.field_scores.values())

    def get_fields_below_threshold(
        self, threshold: float = 0.75
    ) -> Dict[str, ConfidenceScore]:
        """
        Get fields with confidence below threshold.

        Args:
            threshold: Confidence threshold

        Returns:
            Dictionary of field names and scores below threshold
        """
        return {
            field_name: score
            for field_name, score in self.field_scores.items()
            if not score.is_acceptable(threshold)
        }

    def all_acceptable(self, threshold: float = 0.75) -> bool:
        """
        Check if all fields meet confidence threshold.

        Args:
            threshold: Confidence threshold

        Returns:
            True if all fields meet threshold
        """
        return all(
            score.is_acceptable(threshold) for score in self.field_scores.values()
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "fields": {
                field_name: score.to_dict()
                for field_name, score in self.field_scores.items()
            },
            "average": self.get_average_confidence().to_dict(),
            "lowest": self.get_lowest_confidence().to_dict(),
            "highest": self.get_highest_confidence().to_dict(),
        }

    def __str__(self) -> str:
        avg = self.get_average_confidence()
        return f"FieldConfidence(fields={len(self.field_scores)}, avg={avg.to_percentage()}%)"
