export async function serveR2Object(
	bucket: R2Bucket,
	storagePath: string,
): Promise<Response | null> {
	const object = await bucket.get(storagePath);
	if (!object) return null;

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set("etag", object.httpEtag);
	headers.set("cache-control", "private, max-age=3600");

	return new Response(object.body, { headers });
}
