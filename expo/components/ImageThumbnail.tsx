import { Image as ExpoImage } from "expo-image";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

type ImageLoadState = "loading" | "loaded" | "error";

type ImageThumbnailProps = {
	source: { uri: string; headers?: Record<string, string> };
	size?: number;
	onPress?: () => void;
	accessibilityLabel?: string;
};

export function ImageThumbnail({
	source,
	size = 96,
	onPress,
	accessibilityLabel,
}: ImageThumbnailProps) {
	const [loadState, setLoadState] = useState<ImageLoadState>("loading");

	if (loadState === "error") {
		return (
			<Pressable
				onPress={onPress}
				disabled={!onPress}
				accessibilityLabel={accessibilityLabel}
			>
				<View
					style={{ width: size, height: size }}
					className="items-center justify-center rounded-lg bg-muted"
				>
					<Text className="text-2xl text-muted-foreground">!</Text>
					<Text className="text-xs text-muted-foreground">読込失敗</Text>
				</View>
			</Pressable>
		);
	}

	return (
		<Pressable
			onPress={onPress}
			disabled={!onPress}
			className="active:opacity-80"
			accessibilityLabel={accessibilityLabel}
		>
			<View style={{ width: size, height: size }}>
				{loadState === "loading" ? (
					<View
						style={{ width: size, height: size, position: "absolute" }}
						className="rounded-lg bg-muted"
					/>
				) : null}
				<ExpoImage
					source={source}
					style={{ width: size, height: size }}
					className="rounded-lg"
					contentFit="cover"
					onLoad={() => setLoadState("loaded")}
					onError={() => setLoadState("error")}
				/>
			</View>
		</Pressable>
	);
}
