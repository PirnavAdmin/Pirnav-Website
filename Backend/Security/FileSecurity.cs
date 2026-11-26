namespace Pirnav.API.Security
{
    public static class FileSecurity
    {
        public static bool IsValidResume(byte[] fileBytes)
        {
            // PDF signature
            if (fileBytes.Length > 4 &&
                fileBytes[0] == 0x25 &&
                fileBytes[1] == 0x50 &&
                fileBytes[2] == 0x44 &&
                fileBytes[3] == 0x46)
                return true;

            // DOCX signature (ZIP)
            if (fileBytes.Length > 2 &&
                fileBytes[0] == 0x50 &&
                fileBytes[1] == 0x4B)
                return true;

            return false;
        }

        public static bool IsValidImage(byte[] fileBytes)
        {
            if (fileBytes.Length < 4)
                return false;

            // JPEG: FF D8 FF
            if (fileBytes[0] == 0xFF && fileBytes[1] == 0xD8 && fileBytes[2] == 0xFF)
                return true;

            // PNG: 89 50 4E 47 0D 0A 1A 0A
            if (fileBytes.Length >= 8 &&
                fileBytes[0] == 0x89 && fileBytes[1] == 0x50 &&
                fileBytes[2] == 0x4E && fileBytes[3] == 0x47)
                return true;

            // WEBP: RIFF....WEBP
            if (fileBytes.Length >= 12 &&
                fileBytes[0] == 0x52 && fileBytes[1] == 0x49 && fileBytes[2] == 0x46 && fileBytes[3] == 0x46 &&
                fileBytes[8] == 0x57 && fileBytes[9] == 0x45 && fileBytes[10] == 0x42 && fileBytes[11] == 0x50)
                return true;

            return false;
        }
    }
}