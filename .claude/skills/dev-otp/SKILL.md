---
name: dev-otp
description: 開発環境でOTP認証コードをローカルDBから取得する
---

開発環境のローカルD1データベースから、指定メールアドレスの最新OTP認証コードを取得して表示してください。

対象メールアドレス: !`E="$ARGUMENTS"; E="${E:-iwasakiryohei.2@gmail.com}"; echo "$E"`

クエリ結果:
!`E="$ARGUMENTS"; E="${E:-iwasakiryohei.2@gmail.com}"; sqlite3 -separator '|' .wrangler-shared/v3/d1/miniflare-D1DatabaseObject/*.sqlite "SELECT substr(value, 1, instr(value, ':') - 1), datetime(expires_at/1000, 'unixepoch', 'localtime'), datetime(created_at/1000, 'unixepoch', 'localtime') FROM verification WHERE identifier LIKE '%${E}%' ORDER BY created_at DESC LIMIT 1;"`

上記クエリ結果はパイプ区切りで「OTPコード|有効期限|作成日時」の順です。
- 結果がある場合: OTPコード（6桁）と有効期限を分かりやすく表示してください
- 結果が空の場合: 先にアプリのログイン画面からOTP送信を行う必要があることを伝えてください
