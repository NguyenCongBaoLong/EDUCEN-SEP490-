using System;
namespace EducenAPI.Exceptions
{
        public class ConflictException : Exception
        {
            public ConflictException(string message) : base(message)
            {
            }
        }
    
}
