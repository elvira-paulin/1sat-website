export function getSelectedModel(): string {
	if (typeof window !== "undefined") {
		const storedModel = localStorage.getItem("selectedModel");
		return storedModel || "gemma:2b";
	}
	// Default model
	return "gemma:2b";
}
