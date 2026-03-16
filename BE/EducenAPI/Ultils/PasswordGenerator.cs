using System;
using System.Linq;

namespace EducenAPI.Ultils
{
    public static class PasswordGenerator
    {
        private static readonly Random _random = new Random();
        
        // Character sets (loại bỏ confusing chars)
        private const string Uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        private const string Lowercase = "abcdefghijkmnopqrstuvwxyz";
        private const string Digits = "0123456789";
        private const string Special = "!@#$%^&*";
        
        public static string GenerateSecurePassword(int length = 12)
        {
            if (length < 8)
                throw new ArgumentException("Password length must be at least 8 characters", nameof(length));
                
            if (length < 4)
                throw new ArgumentException("Password length must be at least 4 characters to include all character types", nameof(length));

            var allChars = Uppercase + Lowercase + Digits + Special;
            var password = new char[length];
            
            // Ensure at least one of each character type
            password[0] = Uppercase[_random.Next(Uppercase.Length)];
            password[1] = Lowercase[_random.Next(Lowercase.Length)];
            password[2] = Digits[_random.Next(Digits.Length)];
            password[3] = Special[_random.Next(Special.Length)];
            
            // Fill remaining positions
            for (int i = 4; i < length; i++)
            {
                password[i] = allChars[_random.Next(allChars.Length)];
            }
            
            // Shuffle the array to avoid predictable pattern
            return new string(password.OrderBy(x => _random.Next()).ToArray());
        }
        
        public static string GenerateSimplePassword(string username)
        {
            // Fallback method for backward compatibility - but more secure than username + "123"
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString()[^4..]; // Last 4 digits
            return $"{username}@{timestamp}";
        }
    }
}
