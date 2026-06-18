export function formatDate(format: string, date: Date | string = new Date(), lang: string = "hu-HU") {
	const formatters: Record<string, Intl.DateTimeFormatOptions> = {
		"%Y": {year: "numeric"},
		"%y": {year: "2-digit"},
		"%m": {month: "numeric"},
		"%M": {month: "2-digit"},
		"$m": {month: "short"},
		"$M": {month: "long"},
		"%d": {day: "numeric"},
		"%D": {day: "2-digit"},
		"$d": {weekday: "narrow"},
		"$D": {weekday: "long"},
		"%h": {hour: "numeric", hour12: false},
		"%H": {hour: "2-digit", hour12: false},
		"%i": {minute: "numeric"},
		"%I": {minute: "2-digit"},
		"%s": {second: "numeric"},
		"%S": {second: "2-digit"}
	};

	const replacements: Record<string, string> = {};
	if (typeof date === "string") date = new Date(date);

	Object.entries(formatters).forEach(([key, options]) => {
		const formatter = new Intl.DateTimeFormat(lang, options);
		let value = formatter.format(date);

		// Ensure zero-padding for numeric values where needed
		if (["%M", "%D", "%H", "%I", "%S"].includes(key)) {
			value = value.padStart(2, "0");
		}
		value = value.replace(".", "");
		replacements[key] = value;
	});

	// Replace all placeholders with correct values
	return format.replace(/%[YyMmDdDhHiIsS]|\$[mMDd]/g, (match) => replacements[match] ?? match);
}