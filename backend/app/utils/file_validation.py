from typing import Tuple

MAX_JAR_SIZE = 500 * 1024 * 1024  # 500 MB
MIN_JAR_SIZE = 1024               # 1 KB
JAR_MAGIC_BYTES = b'PK\x03\x04'  # ZIP/JAR magic number


def validate_jar_file(filename: str, file_bytes: bytes) -> Tuple[bool, str]:
    if not filename.lower().endswith(".jar"):
        return False, f"File must have .jar extension (got: {filename})"

    if len(file_bytes) < MIN_JAR_SIZE:
        return False, f"JAR file is too small ({len(file_bytes)} bytes)"

    if len(file_bytes) > MAX_JAR_SIZE:
        return False, f"JAR file exceeds 500 MB limit ({len(file_bytes)} bytes)"

    if not file_bytes.startswith(JAR_MAGIC_BYTES):
        return False, "Invalid JAR format — file does not start with ZIP magic bytes"

    return True, "JAR file validation successful"
