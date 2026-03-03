import { Resend } from "resend";
import type { EmailMessage, SendResult } from "./types";

export async function sendEmail(
	apiKey: string,
	from: string,
	message: EmailMessage,
): Promise<SendResult> {
	const resend = new Resend(apiKey);

	const { data, error } = await resend.emails.send({
		from,
		to: message.to,
		subject: message.subject,
		html: message.html,
	});

	if (error || !data) {
		return { success: false, error: error?.message ?? "Unknown error" };
	}

	return { success: true, id: data.id };
}
