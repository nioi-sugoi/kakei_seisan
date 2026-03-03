export type EmailMessage = {
	to: string | string[];
	subject: string;
	html: string;
};

export type SendResult =
	| { success: true; id: string }
	| { success: false; error: string };
