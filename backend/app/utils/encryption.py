from cryptography.fernet import Fernet
from typing import Optional


class EncryptionManager:
    def __init__(self, key: str):
        try:
            self.cipher = Fernet(key.encode())
        except Exception as e:
            raise ValueError(f"Invalid ENCRYPTION_KEY format: {e}")

    def encrypt(self, plaintext: str) -> str:
        if not plaintext:
            return plaintext
        return self.cipher.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> str:
        if not ciphertext:
            return ciphertext
        return self.cipher.decrypt(ciphertext.encode()).decode()


_instance: Optional[EncryptionManager] = None


def get_encryption_manager() -> EncryptionManager:
    global _instance
    if _instance is None:
        from app.config import get_settings
        key = get_settings().encryption_key
        if not key:
            raise ValueError("ENCRYPTION_KEY environment variable not set")
        _instance = EncryptionManager(key)
    return _instance
