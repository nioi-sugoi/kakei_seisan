import { Image as ExpoImage } from "expo-image";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Dimensions,
	Modal,
	Pressable,
	Text,
	View,
} from "react-native";
import {
	Gesture,
	GestureDetector,
	GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";

type ImageSource = {
	uri: string;
	headers?: Record<string, string>;
};
type ImageViewerModalProps = {
	visible: boolean;
	images: ImageSource[];
	initialIndex?: number;
	onClose: () => void;
};
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SPRING_CONFIG = { damping: 20, stiffness: 200 };
const DISMISS_THRESHOLD = 120;
function ZoomableImage({ source }: { source: ImageSource }) {
	const scale = useSharedValue(1);
	const savedScale = useSharedValue(1);
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const savedTranslateX = useSharedValue(0);
	const savedTranslateY = useSharedValue(0);
	const pinchGesture = Gesture.Pinch()
		.onUpdate((e) => {
			scale.value = savedScale.value * e.scale;
		})
		.onEnd(() => {
			if (scale.value < 1) {
				scale.value = withSpring(1, SPRING_CONFIG);
				savedScale.value = 1;
				translateX.value = withSpring(0, SPRING_CONFIG);
				translateY.value = withSpring(0, SPRING_CONFIG);
				savedTranslateX.value = 0;
				savedTranslateY.value = 0;
			} else if (scale.value > 5) {
				scale.value = withSpring(5, SPRING_CONFIG);
				savedScale.value = 5;
			} else {
				savedScale.value = scale.value;
			}
		});
	const doubleTapGesture = Gesture.Tap()
		.numberOfTaps(2)
		.onEnd(() => {
			if (scale.value > 1.1) {
				scale.value = withSpring(1, SPRING_CONFIG);
				savedScale.value = 1;
				translateX.value = withSpring(0, SPRING_CONFIG);
				translateY.value = withSpring(0, SPRING_CONFIG);
				savedTranslateX.value = 0;
				savedTranslateY.value = 0;
			} else {
				scale.value = withSpring(2.5, SPRING_CONFIG);
				savedScale.value = 2.5;
			}
		});
	const panGesture = Gesture.Pan()
		.minPointers(1)
		.onUpdate((e) => {
			if (savedScale.value > 1) {
				translateX.value = savedTranslateX.value + e.translationX;
				translateY.value = savedTranslateY.value + e.translationY;
			}
		})
		.onEnd(() => {
			savedTranslateX.value = translateX.value;
			savedTranslateY.value = translateY.value;
		});
	const composed = Gesture.Simultaneous(
		pinchGesture,
		Gesture.Exclusive(doubleTapGesture, panGesture),
	);
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateX: translateX.value },
			{ translateY: translateY.value },
			{ scale: scale.value },
		],
	}));
	return (
		<GestureDetector gesture={composed}>
			<Animated.View
				style={[
					{
						width: SCREEN_WIDTH,
						height: SCREEN_HEIGHT * 0.75,
						justifyContent: "center",
						alignItems: "center",
					},
					animatedStyle,
				]}
			>
				<ExpoImage
					source={source}
					style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.75 }}
					contentFit="contain"
				/>
			</Animated.View>
		</GestureDetector>
	);
}
function SwipeToCloseWrapper({
	children,
	onClose,
}: {
	children: React.ReactNode;
	onClose: () => void;
}) {
	const translateY = useSharedValue(0);
	const opacity = useSharedValue(1);
	const panGesture = Gesture.Pan()
		.onUpdate((e) => {
			if (e.translationY > 0) {
				translateY.value = e.translationY;
				opacity.value = 1 - e.translationY / (DISMISS_THRESHOLD * 3);
			}
		})
		.onEnd((e) => {
			if (e.translationY > DISMISS_THRESHOLD) {
				runOnJS(onClose)();
			} else {
				translateY.value = withSpring(0, SPRING_CONFIG);
				opacity.value = withSpring(1, SPRING_CONFIG);
			}
		});
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: translateY.value }],
		opacity: opacity.value,
	}));
	return (
		<GestureDetector gesture={panGesture}>
			<Animated.View style={[{ flex: 1 }, animatedStyle]}>
				{children}
			</Animated.View>
		</GestureDetector>
	);
}
export function ImageViewerModal({
	visible,
	images,
	initialIndex = 0,
	onClose,
}: ImageViewerModalProps) {
	const [currentIndex, setCurrentIndex] = useState(initialIndex);
	useEffect(() => {
		if (visible) {
			setCurrentIndex(initialIndex);
		}
	}, [visible, initialIndex]);
	if (images.length === 0) return null;
	const currentImage = images[currentIndex];
	const hasPrev = currentIndex > 0;
	const hasNext = currentIndex < images.length - 1;
	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			statusBarTranslucent
			onRequestClose={onClose}
		>
			<GestureHandlerRootView
				style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)" }}
			>
				{/* ヘッダー */}
				<View className="flex-row items-center justify-between px-4 pt-14 pb-2">
					{images.length > 1 ? (
						<Text className="text-base text-white">
							{currentIndex + 1} / {images.length}
						</Text>
					) : (
						<View />
					)}
					<Pressable
						onPress={onClose}
						accessibilityLabel="閉じる"
						className="h-10 w-10 items-center justify-center rounded-full active:opacity-60"
						style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
					>
						<Text className="text-lg font-bold text-white">✕</Text>
					</Pressable>
				</View>
				{/* 画像エリア */}
				<SwipeToCloseWrapper onClose={onClose}>
					<View className="flex-1 items-center justify-center">
						{currentImage ? (
							<ZoomableImage source={currentImage} />
						) : (
							<ActivityIndicator color="white" size="large" />
						)}
						{/* 左矢印 */}
						{hasPrev ? (
							<Pressable
								onPress={() => setCurrentIndex((i) => i - 1)}
								accessibilityLabel="前の画像"
								className="absolute left-2 h-12 w-12 items-center justify-center rounded-full active:opacity-60"
								style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
							>
								<Text className="text-xl text-white">‹</Text>
							</Pressable>
						) : null}
						{/* 右矢印 */}
						{hasNext ? (
							<Pressable
								onPress={() => setCurrentIndex((i) => i + 1)}
								accessibilityLabel="次の画像"
								className="absolute right-2 h-12 w-12 items-center justify-center rounded-full active:opacity-60"
								style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
							>
								<Text className="text-xl text-white">›</Text>
							</Pressable>
						) : null}
					</View>
				</SwipeToCloseWrapper>
				{/* ページインジケーター */}
				{images.length > 1 ? (
					<View className="flex-row items-center justify-center gap-2 pb-12">
						{images.map((img, i) => (
							<View
								key={img.uri}
								style={{
									width: 8,
									height: 8,
									borderRadius: 4,
									backgroundColor:
										i === currentIndex ? "white" : "rgba(255,255,255,0.4)",
								}}
							/>
						))}
					</View>
				) : (
					<View className="pb-12" />
				)}
			</GestureHandlerRootView>
		</Modal>
	);
}
