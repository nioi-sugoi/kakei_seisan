export async function serveR2Object(
	bucket: R2Bucket,
	storagePath: string,
): Promise<Response | null> {
	const object = await bucket.get(storagePath);
	if (!object) return null;

	const headers = new Headers();
	// R2 アップロード時に httpMetadata で保存した Content-Type 等をレスポンスヘッダーに反映
	object.writeHttpMetadata(headers);
	headers.set("etag", object.httpEtag);
	headers.set("cache-control", "private, max-age=3600");

	return new Response(object.body, { headers });
}
