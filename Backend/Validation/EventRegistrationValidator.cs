using FluentValidation;
using Pirnav.API.DTOs;

namespace Pirnav.API.Validation
{
    public class EventRegistrationValidator : AbstractValidator<EventRegistrationDto>
    {
        public EventRegistrationValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Full name is required.")
                .MinimumLength(2).WithMessage("Name must be at least 2 characters.")
                .MaximumLength(150).WithMessage("Name must be 150 characters or less.")
                .Matches(@"^[a-zA-Z\s\.\-']+$").WithMessage("Please enter a valid name.")
                .When(x => string.IsNullOrWhiteSpace(x.Website));

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email address is required.")
                .MaximumLength(150).WithMessage("Email must be 150 characters or less.")
                .EmailAddress().WithMessage("Please enter a valid email address.")
                .When(x => string.IsNullOrWhiteSpace(x.Website));

            RuleFor(x => x.Phone)
                .NotEmpty().WithMessage("Phone number is required.")
                .MaximumLength(30).WithMessage("Phone number is too long.")
                .Matches(@"^\+?[0-9\s\-\(\)]{7,20}$").WithMessage("Please enter a valid phone number.")
                .When(x => string.IsNullOrWhiteSpace(x.Website));

            RuleFor(x => x.Company)
                .NotEmpty().WithMessage("Company or institution is required.")
                .MinimumLength(2).WithMessage("Company name must be at least 2 characters.")
                .MaximumLength(150).WithMessage("Company name must be 150 characters or less.")
                .When(x => string.IsNullOrWhiteSpace(x.Website));

            RuleFor(x => x.ConsentAccepted)
                .Equal(true).WithMessage("Please accept the privacy consent to register.")
                .When(x => string.IsNullOrWhiteSpace(x.Website));
        }
    }
}
