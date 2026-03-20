export class Webhook {
	constructor(_secret: string) {}
	verify(_payload: string, _headers: Record<string, string>) {
		return {};
	}
}
