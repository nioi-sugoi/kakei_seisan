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
