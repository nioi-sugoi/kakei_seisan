import { Image } from "expo-image";
import { Link } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";
import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";

export default function HomeScreen() {
	return (
		<ParallaxScrollView
			headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
			headerImage={
				<Image
					source={require("@/assets/images/partial-react-logo.png")}
					style={styles.reactLogo}
				/>
			}
		>
			<View className="flex-row items-center gap-2">
				<Text className="text-foreground text-[32px] font-bold leading-[32px]">
					Welcome!
				</Text>
				<HelloWave />
			</View>
			<View className="gap-2 mb-2">
				<Text className="text-foreground text-xl font-bold">
					Step 1: Try it
				</Text>
				<Text className="text-foreground text-base leading-6">
					Edit{" "}
					<Text className="text-foreground text-base font-semibold leading-6">
						app/(tabs)/index.tsx
					</Text>{" "}
					to see changes. Press{" "}
					<Text className="text-foreground text-base font-semibold leading-6">
						{Platform.select({
							ios: "cmd + d",
							android: "cmd + m",
							web: "F12",
						})}
					</Text>{" "}
					to open developer tools.
				</Text>
			</View>
			<View className="gap-2 mb-2">
				<Link href="/modal">
					<Link.Trigger>
						<Text className="text-foreground text-xl font-bold">
							Step 2: Explore
						</Text>
					</Link.Trigger>
					<Link.Preview />
					<Link.Menu>
						<Link.MenuAction
							title="Action"
							icon="cube"
							onPress={() => alert("Action pressed")}
						/>
						<Link.MenuAction
							title="Share"
							icon="square.and.arrow.up"
							onPress={() => alert("Share pressed")}
						/>
						<Link.Menu title="More" icon="ellipsis">
							<Link.MenuAction
								title="Delete"
								icon="trash"
								destructive
								onPress={() => alert("Delete pressed")}
							/>
						</Link.Menu>
					</Link.Menu>
				</Link>

				<Text className="text-foreground text-base leading-6">
					{`Tap the Explore tab to learn more about what's included in this starter app.`}
				</Text>
			</View>
			<View className="gap-2 mb-2">
				<Text className="text-foreground text-xl font-bold">
					Step 3: Build your app
				</Text>
				<Text className="text-foreground text-base leading-6">
					Replace this sample screen with the features for your household
					settlement flow.
				</Text>
			</View>
		</ParallaxScrollView>
	);
}

const styles = StyleSheet.create({
	reactLogo: {
		height: 178,
		width: 290,
		bottom: 0,
		left: 0,
		position: "absolute",
	},
});
