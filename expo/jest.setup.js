jest.mock("expo-constants", () => ({
	default: { appOwnership: null, expoConfig: { hostUri: "localhost:8081" } },
}));

jest.mock("expo-image-picker", () => ({
	requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
	requestMediaLibraryPermissionsAsync: jest
		.fn()
		.mockResolvedValue({ granted: true }),
	launchCameraAsync: jest
		.fn()
		.mockResolvedValue({ canceled: true, assets: [] }),
	launchImageLibraryAsync: jest
		.fn()
		.mockResolvedValue({ canceled: true, assets: [] }),
}));

jest.mock("expo-image", () => {
	const { View } = require("react-native");
	return { Image: View };
});

jest.mock("expo-secure-store", () => ({
	getItemAsync: jest.fn(),
	setItemAsync: jest.fn(),
	deleteItemAsync: jest.fn(),
}));

jest.mock("@better-auth/expo/client", () => ({
	expoClient: jest.fn(() => ({})),
}));

jest.mock("better-auth/client/plugins", () => ({
	emailOTPClient: jest.fn(() => ({})),
}));

jest.mock("better-auth/react", () => ({
	createAuthClient: jest.fn(() => ({
		getCookie: jest.fn(() => null),
	})),
}));

jest.mock("react-native-safe-area-context", () => {
	const { View } = require("react-native");
	return {
		SafeAreaView: View,
		SafeAreaProvider: View,
		useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
		useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
	};
});

jest.mock("react-native-reanimated", () => {
	const { View } = require("react-native");
	return {
		__esModule: true,
		default: {
			View,
			createAnimatedComponent: (component) => component,
		},
		useSharedValue: (init) => ({ value: init }),
		useAnimatedStyle: () => ({}),
		withSpring: (val) => val,
		runOnJS: (fn) => fn,
		createAnimatedComponent: (component) => component,
	};
});

jest.mock("react-native-gesture-handler", () => ({
	GestureHandlerRootView: ({ children }) => children,
	Gesture: {
		Pinch: () => ({
			onUpdate: () => ({ onEnd: () => ({}) }),
			onEnd: () => ({}),
		}),
		Tap: () => ({
			numberOfTaps: () => ({ onEnd: () => ({}) }),
			onEnd: () => ({}),
		}),
		Pan: () => ({
			minPointers: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }),
			onUpdate: () => ({ onEnd: () => ({}) }),
			onEnd: () => ({}),
		}),
		Simultaneous: () => ({}),
		Exclusive: () => ({}),
	},
	GestureDetector: ({ children }) => children,
}));
