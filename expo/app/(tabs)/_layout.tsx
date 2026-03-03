import { Tabs } from "expo-router";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarButton: HapticTab,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "タイムライン",
					tabBarIcon: ({ color }) => (
						<IconSymbol size={28} name="clock.fill" color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="partner"
				options={{
					title: "パートナー",
					tabBarIcon: ({ color }) => (
						<IconSymbol size={28} name="person.2.fill" color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: "設定",
					tabBarIcon: ({ color }) => (
						<IconSymbol size={28} name="gearshape.fill" color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
