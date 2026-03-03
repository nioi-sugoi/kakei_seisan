import { type PropsWithChildren, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function Collapsible({
	children,
	title,
}: PropsWithChildren & { title: string }) {
	const [isOpen, setIsOpen] = useState(false);
	const theme = useColorScheme() ?? "light";

	return (
		<View className="bg-background">
			<TouchableOpacity
				className="flex-row items-center gap-1.5"
				onPress={() => setIsOpen((value) => !value)}
				activeOpacity={0.8}
			>
				<IconSymbol
					name="chevron.right"
					size={18}
					weight="medium"
					color={theme === "light" ? "#93646F" : "#9BA1A6"}
					style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }}
				/>

				<Text className="text-foreground text-base font-semibold leading-6">
					{title}
				</Text>
			</TouchableOpacity>
			{isOpen && <View className="mt-1.5 ml-6 bg-background">{children}</View>}
		</View>
	);
}
