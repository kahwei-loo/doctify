"""
Password Policy Module

Implements NIST-compliant password validation and strength checking.
"""

import re
from typing import List, Tuple
from app.core.exceptions import ValidationError


class PasswordPolicy:
    """
    Password policy validator implementing NIST guidelines.

    Implements password strength validation following NIST Special Publication 800-63B
    guidelines for secure password policies.
    """

    # Password length requirements
    MIN_LENGTH = 8
    MAX_LENGTH = 128

    # Complexity requirements
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = True

    # Common weak passwords (simplified list - in production, use a comprehensive wordlist)
    COMMON_PASSWORDS = [
        'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey',
        'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master',
        'sunshine', 'ashley', 'bailey', 'passw0rd', 'shadow', 'superman',
        'qazwsx', 'michael', 'football', 'welcome', 'jesus', 'ninja',
        'mustang', 'password1', '123123', 'admin', 'login', 'welcome123'
    ]

    # Common patterns to detect
    SEQUENTIAL_PATTERNS = [
        'abcdefgh', 'bcdefghi', 'cdefghij', 'defghijk',
        '12345678', '23456789', '01234567', '87654321',
        'qwertyui', 'asdfghjk', 'zxcvbnm'
    ]

    @classmethod
    def validate_password(cls, password: str) -> Tuple[bool, List[str]]:
        """
        Validate password strength against policy requirements.

        Args:
            password: Password string to validate

        Returns:
            Tuple of (is_valid: bool, error_messages: List[str])

        Examples:
            >>> PasswordPolicy.validate_password("Weak123!")
            (True, [])

            >>> PasswordPolicy.validate_password("weak")
            (False, ["Password must be at least 8 characters", ...])
        """
        errors = []

        # Length validation
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Password must be at least {cls.MIN_LENGTH} characters")
        if len(password) > cls.MAX_LENGTH:
            errors.append(f"Password must be at most {cls.MAX_LENGTH} characters")

        # Complexity validation
        if cls.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")

        if cls.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")

        if cls.REQUIRE_DIGIT and not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")

        if cls.REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")

        # Common password check
        if cls._is_common_password(password):
            errors.append("Password is too common, please choose a stronger one")

        # Repeated character check
        if re.search(r'(.)\1{2,}', password):
            errors.append("Password should not contain repeated characters")

        # Sequential pattern check
        if cls._contains_sequential_pattern(password):
            errors.append("Password should not contain sequential patterns")

        return (len(errors) == 0, errors)

    @classmethod
    def _is_common_password(cls, password: str) -> bool:
        """
        Check if password is in common weak password list.

        Args:
            password: Password to check

        Returns:
            True if password is common/weak, False otherwise
        """
        password_lower = password.lower()

        # Direct match
        if password_lower in cls.COMMON_PASSWORDS:
            return True

        # Check if common password is contained in the password
        for common in cls.COMMON_PASSWORDS:
            if len(common) >= 6 and common in password_lower:
                return True

        return False

    @classmethod
    def _contains_sequential_pattern(cls, password: str) -> bool:
        """
        Check if password contains sequential patterns.

        Args:
            password: Password to check

        Returns:
            True if sequential pattern found, False otherwise
        """
        password_lower = password.lower()

        for pattern in cls.SEQUENTIAL_PATTERNS:
            if pattern in password_lower:
                return True
            # Check reverse pattern
            if pattern[::-1] in password_lower:
                return True

        return False

    @classmethod
    def validate_and_raise(cls, password: str) -> None:
        """
        Validate password and raise ValidationError if invalid.

        Args:
            password: Password to validate

        Raises:
            ValidationError: If password doesn't meet policy requirements

        Examples:
            >>> PasswordPolicy.validate_and_raise("Weak123!")
            # No exception

            >>> PasswordPolicy.validate_and_raise("weak")
            ValidationError: Password validation failed: ...
        """
        is_valid, errors = cls.validate_password(password)

        if not is_valid:
            error_message = "Password validation failed: " + "; ".join(errors)
            raise ValidationError(
                error_message,
                details={"password_errors": errors}
            )

    @classmethod
    def get_password_requirements(cls) -> dict:
        """
        Get password policy requirements as a dictionary.

        Returns:
            Dictionary containing password requirements

        Examples:
            >>> requirements = PasswordPolicy.get_password_requirements()
            >>> print(requirements['min_length'])
            8
        """
        return {
            "min_length": cls.MIN_LENGTH,
            "max_length": cls.MAX_LENGTH,
            "require_uppercase": cls.REQUIRE_UPPERCASE,
            "require_lowercase": cls.REQUIRE_LOWERCASE,
            "require_digit": cls.REQUIRE_DIGIT,
            "require_special": cls.REQUIRE_SPECIAL,
            "allowed_special_characters": "!@#$%^&*(),.?\":{}|<>",
        }

    @classmethod
    def generate_password_hint(cls) -> str:
        """
        Generate a human-readable password requirements hint.

        Returns:
            String describing password requirements

        Examples:
            >>> hint = PasswordPolicy.generate_password_hint()
            >>> print(hint)
            Password must be 8-128 characters...
        """
        requirements = []
        requirements.append(f"{cls.MIN_LENGTH}-{cls.MAX_LENGTH} characters")

        if cls.REQUIRE_UPPERCASE:
            requirements.append("at least one uppercase letter")
        if cls.REQUIRE_LOWERCASE:
            requirements.append("at least one lowercase letter")
        if cls.REQUIRE_DIGIT:
            requirements.append("at least one digit")
        if cls.REQUIRE_SPECIAL:
            requirements.append("at least one special character")

        requirements.append("no common passwords or sequential patterns")
        requirements.append("no repeated characters")

        return "Password must contain: " + ", ".join(requirements)
