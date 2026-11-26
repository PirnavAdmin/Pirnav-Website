namespace Pirnav.API.Services
{
    public record DemoProductInfo(string Id, string ShortName, string Title, string Category);

    public static class DemoProductCatalog
    {
        public static readonly IReadOnlyList<DemoProductInfo> All = new List<DemoProductInfo>
        {
            new("peoplehrsync", "PeopleHRSync", "PeopleHRSync — Modern HRMS SaaS", "Modern HRMS SaaS"),
            new("pulseleef", "PulseLeef", "PulseLeef — Healthcare & Clinical Suite", "Healthcare & Medical"),
            new("pupil-scholar", "Pupil Scholar", "Pupil Scholar — Education & Campus ERP", "Education & Campus ERP"),
            new("kini-edx", "KINI", "Kini — KiniEdx Learning Platform", "EdTech & Learning"),
            new("curecode-bug-tracker", "CureCode", "CureCode — Agile Bug Tracker & QA Suite", "Developer Tools & QA")
        };

        private static readonly Dictionary<string, string> Aliases = new(StringComparer.OrdinalIgnoreCase)
        {
            ["kini"] = "kini-edx",
            ["kiniedx"] = "kini-edx",
            ["curecode"] = "curecode-bug-tracker",
            ["pupil"] = "pupil-scholar"
        };

        public static readonly IReadOnlyList<string> ValidStatuses = new[]
        {
            "New",
            "Contacted",
            "Demo Scheduled",
            "Demo Completed",
            "Qualified",
            "Converted",
            "Lost"
        };

        public static DemoProductInfo? Resolve(string? productIdOrTitle)
        {
            if (string.IsNullOrWhiteSpace(productIdOrTitle))
                return null;

            var input = productIdOrTitle.Trim();
            if (Aliases.TryGetValue(input, out var mappedId))
                input = mappedId;

            return All.FirstOrDefault(p =>
                string.Equals(p.Id, input, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(p.ShortName, input, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(p.Title, input, StringComparison.OrdinalIgnoreCase));
        }

        public static bool IsValidStatus(string? status, out string canonical)
        {
            canonical = string.Empty;
            if (string.IsNullOrWhiteSpace(status))
                return false;

            var match = ValidStatuses.FirstOrDefault(s =>
                string.Equals(s, status.Trim(), StringComparison.OrdinalIgnoreCase));

            if (match == null)
                return false;

            canonical = match;
            return true;
        }
    }
}
