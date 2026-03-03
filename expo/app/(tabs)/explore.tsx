import { Image } from "expo-image";
import { Platform, StyleSheet, Text, View } from "react-native";
import { ExternalLink } from "@/components/external-link";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { Collapsible } from "@/components/ui/collapsible";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function TabTwoScreen() {
	return (
		<ParallaxScrollView
			headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
			headerImage={
				<IconSymbol
					size={310}
					color="#808080"
					name="chevron.left.forwardslash.chevron.right"
					style={styles.headerImage}
				/>
			}
		>
			<View className="flex-row gap-2">
				<Text className="text-foreground text-[32px] font-bold leading-[32px]">
					Explore
				</Text>
			</View>
			<Text className="text-foreground text-base leading-6">
				This app includes example code to help you get started.
			</Text>
			<Collapsible title="File-based routing">
				<Text className="text-foreground text-base leading-6">
					This app has two screens:{" "}
					<Text className="text-foreground text-base font-semibold leading-6">
						app/(tabs)/index.tsx
					</Text>{" "}
					and{" "}
					<Text className="text-foreground text-base font-semibold leading-6">
						app/(tabs)/explore.tsx
					</Text>
				</Text>
				<Text className="text-foreground text-base leading-6">
					The layout file in{" "}
					<Text className="text-foreground text-base font-semibold leading-6">
						app/(tabs)/_layout.tsx
					</Text>{" "}
					sets up the tab navigator.
				</Text>
				<ExternalLink href="https://docs.expo.dev/router/introduction">
					<Text className="text-primary text-base leading-[30px]">
						Learn more
					</Text>
				</ExternalLink>
			</Collapsible>
			<Collapsible title="Android, iOS, and web support">
				<Text className="text-foreground text-base leading-6">
					You can open this project on Android, iOS, and the web. To open the
					web version, press{" "}
					<Text className="text-foreground text-base font-semibold leading-6">
						w
					</Text>{" "}
					in the terminal running this project.
				</Text>
			</Collapsible>
			<Collapsible title="Images">
				<Text className="text-foreground text-base leading-6">
					For static images, you can use the{" "}
					<Text className="text-foreground text-base font-semibold leading-6">
						@2x
					</Text>{" "}
					and{" "}
					<Text className="text-foreground text-base font-semibold leading-6">
						@3x
					</Text>{" "}
					suffixes to provide files for different screen densities
				</Text>
				<Image
					source={require("@/assets/images/react-logo.png")}
					style={{ width: 100, height: 100, alignSelf: "center" }}
				/>
				<ExternalLink href="https://reactnative.dev/docs/images">
					<Text className="text-primary text-base leading-[30px]">
						Learn more
					</Text>
				</ExternalLink>
			</Collapsible>
			<Collapsible title="Light and dark mode components">
				<Text className="text-foreground text-base leading-6">
					This template has light and dark mode support. The{" "}
					<Text className="text-foreground text-base font-semibold leading-6">
						useColorScheme()
					</Text>{" "}
					hook lets you inspect what the user&apos;s current color scheme is,
					and so you can adjust UI colors accordingly.
				</Text>
				<ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
					<Text className="text-primary text-base leading-[30px]">
						Learn more
					</Text>
				</ExternalLink>
			</Collapsible>
			<Collapsible title="Animations">
				<Text className="text-foreground text-base leading-6">
					This template includes an example of an animated component. The{" "}
					<Text className="text-foreground text-base font-semibold leading-6">
						components/HelloWave.tsx
					</Text>{" "}
					component uses the powerful{" "}
					<Text className="text-foreground text-base font-semibold font-mono leading-6">
						react-native-reanimated
					</Text>{" "}
					library to create a waving hand animation.
				</Text>
				{Platform.select({
					ios: (
						<Text className="text-foreground text-base leading-6">
							The{" "}
							<Text className="text-foreground text-base font-semibold leading-6">
								components/ParallaxScrollView.tsx
							</Text>{" "}
							component provides a parallax effect for the header image.
						</Text>
					),
				})}
			</Collapsible>
		</ParallaxScrollView>
	);
}

const styles = StyleSheet.create({
	headerImage: {
		color: "#808080",
		bottom: -90,
		left: -35,
		position: "absolute",
	},
});
