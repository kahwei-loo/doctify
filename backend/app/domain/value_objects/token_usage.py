"""
Token Usage Value Object

Represents token consumption metrics as an immutable value object.
"""

from dataclasses import dataclass
from typing import Dict, Any


@dataclass(frozen=True)
class TokenUsage:
    """
    Immutable token usage metrics.

    Represents the number of tokens consumed during AI processing.
    """

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

    def __post_init__(self):
        """Validate token usage values."""
        if self.prompt_tokens < 0:
            raise ValueError("Prompt tokens cannot be negative")

        if self.completion_tokens < 0:
            raise ValueError("Completion tokens cannot be negative")

        if self.total_tokens < 0:
            raise ValueError("Total tokens cannot be negative")

        # Validate total equals sum
        expected_total = self.prompt_tokens + self.completion_tokens
        if self.total_tokens != expected_total:
            raise ValueError(
                f"Total tokens ({self.total_tokens}) must equal "
                f"prompt ({self.prompt_tokens}) + completion ({self.completion_tokens}) tokens"
            )

    @classmethod
    def create(cls, prompt_tokens: int, completion_tokens: int) -> "TokenUsage":
        """
        Factory method to create TokenUsage.

        Args:
            prompt_tokens: Number of prompt tokens
            completion_tokens: Number of completion tokens

        Returns:
            TokenUsage instance
        """
        total_tokens = prompt_tokens + completion_tokens
        return cls(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
        )

    @classmethod
    def zero(cls) -> "TokenUsage":
        """
        Create zero token usage.

        Returns:
            TokenUsage with zero tokens
        """
        return cls(prompt_tokens=0, completion_tokens=0, total_tokens=0)

    def add(self, other: "TokenUsage") -> "TokenUsage":
        """
        Add two token usage objects.

        Args:
            other: Another TokenUsage instance

        Returns:
            New TokenUsage with combined values
        """
        return TokenUsage.create(
            prompt_tokens=self.prompt_tokens + other.prompt_tokens,
            completion_tokens=self.completion_tokens + other.completion_tokens,
        )

    def to_dict(self) -> Dict[str, int]:
        """Convert to dictionary."""
        return {
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens,
        }

    def __str__(self) -> str:
        return f"TokenUsage(prompt={self.prompt_tokens}, completion={self.completion_tokens}, total={self.total_tokens})"


@dataclass(frozen=True)
class TokenUsageSummary:
    """
    Immutable token usage summary with cost estimation.

    Extends TokenUsage with cost and rate information.
    """

    token_usage: TokenUsage
    cost_per_thousand: float
    estimated_cost: float

    def __post_init__(self):
        """Validate summary values."""
        if self.cost_per_thousand < 0:
            raise ValueError("Cost per thousand cannot be negative")

        if self.estimated_cost < 0:
            raise ValueError("Estimated cost cannot be negative")

    @classmethod
    def create(
        cls,
        token_usage: TokenUsage,
        cost_per_thousand: float,
    ) -> "TokenUsageSummary":
        """
        Factory method to create TokenUsageSummary.

        Args:
            token_usage: TokenUsage instance
            cost_per_thousand: Cost per 1000 tokens

        Returns:
            TokenUsageSummary instance
        """
        estimated_cost = (token_usage.total_tokens / 1000.0) * cost_per_thousand
        return cls(
            token_usage=token_usage,
            cost_per_thousand=cost_per_thousand,
            estimated_cost=round(estimated_cost, 4),
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            **self.token_usage.to_dict(),
            "cost_per_thousand": self.cost_per_thousand,
            "estimated_cost": self.estimated_cost,
        }

    def __str__(self) -> str:
        return (
            f"TokenUsageSummary(total_tokens={self.token_usage.total_tokens}, "
            f"estimated_cost=${self.estimated_cost:.4f})"
        )
