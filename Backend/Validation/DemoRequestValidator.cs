using FluentValidation;
using Pirnav.API.DTOs;
using Pirnav.API.Services;

namespace Pirnav.API.Validation
{
    public class DemoRequestValidator : AbstractValidator<DemoRequestDto>
    {
        public DemoRequestValidator()
        {
            RuleFor(x => x.ProductId)
                .NotEmpty().WithMessage("Please select a product for your demo.")
                .Must(id => DemoProductCatalog.Resolve(id) != null)
                .WithMessage("Selected product is invalid.")
                .When(x => string.IsNullOrWhiteSpace(x.Website));

            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Name is required.")
                .MinimumLength(2).WithMessage("Name must be at least 2 characters.")
                .MaximumLength(100).WithMessage("Name must be 100 characters or less.")
                .Matches(@"^[a-zA-Z\s\.\-']+$").WithMessage("Please enter a valid name.")
                .When(x => string.IsNullOrWhiteSpace(x.Website));

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Work email is required.")
                .MaximumLength(150).WithMessage("Email must be 150 characters or less.")
                .EmailAddress().WithMessage("Please enter a valid email address.")
                .When(x => string.IsNullOrWhiteSpace(x.Website));

            RuleFor(x => x.Phone)
                .NotEmpty().WithMessage("Phone number is required.")
                .MaximumLength(30).WithMessage("Phone number is too long.")
                .Matches(@"^\+?[0-9\s\-\(\)]{7,20}$").WithMessage("Please enter a valid phone number.")
                .When(x => string.IsNullOrWhiteSpace(x.Website));

            RuleFor(x => x.Company)
                .NotEmpty().WithMessage("Company or institution name is required.")
                .MinimumLength(2).WithMessage("Company name must be at least 2 characters.")
                .MaximumLength(150).WithMessage("Company name must be 150 characters or less.")
                .When(x => string.IsNullOrWhiteSpace(x.Website));

            RuleFor(x => x.Message)
                .NotEmpty().WithMessage("Please share your demo requirements.")
                .MinimumLength(5).WithMessage("Please share a brief note (at least 5 characters).")
                .MaximumLength(2000).WithMessage("Requirements must be 2000 characters or less.")
                .When(x => string.IsNullOrWhiteSpace(x.Website));

            RuleFor(x => x.ConsentAccepted)
                .Equal(true).WithMessage("Please accept the privacy consent to request a demo.")
                .When(x => string.IsNullOrWhiteSpace(x.Website));
        }
    }
}
