import { Pressable, Text, View } from "react-native";

type Category = "advance" | "deposit";

type CategorySelectorProps = {
	value: Category;
	onChange: (value: Category) => void;
};

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
	return (
		<View className="flex-row rounded-xl bg-secondary p-1">
			<Pressable
				onPress={() => onChange("advance")}
				className={`flex-1 items-center rounded-lg py-2.5 ${
					value === "advance" ? "bg-primary" : ""
				}`}
			>
				<Text
					className={`text-sm font-semibold ${
						value === "advance"
							? "text-primary-foreground"
							: "text-muted-foreground"
					}`}
				>
					立替
				</Text>
			</Pressable>
			<Pressable
				onPress={() => onChange("deposit")}
				className={`flex-1 items-center rounded-lg py-2.5 ${
					value === "deposit" ? "bg-orange-500" : ""
				}`}
			>
				<Text
					className={`text-sm font-semibold ${
						value === "deposit" ? "text-white" : "text-muted-foreground"
					}`}
				>
					預り
				</Text>
			</Pressable>
		</View>
	);
}
