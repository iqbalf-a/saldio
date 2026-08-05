import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDarkColor } from "../lib/darkColors";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary untuk menangkap crash di React tree.
 * 
 * Logging:
 * - console.error dengan detail error + component stack
 * - Siap di-upgrade ke Sentry/Rollbar dengan menambahkan
 *   Sentry.captureException(error) di componentDidCatch
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log detail untuk debugging
    console.error("[ErrorBoundary] Caught error:", error.message);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);

    // TODO: Integrasi Sentry/Rollbar di sini
    // import * as Sentry from "@sentry/react";
    // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

// Functional wrapper to use hooks inside class component fallback
function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const red = useDarkColor("red");
  return (
    <View className="flex-1 items-center justify-center bg-saldio-bg dark:bg-saldio-dark-bg p-6">
      <Ionicons name="warning-outline" size={48} color={red} />
      <Text className="mt-4 text-center font-sans-bold text-lg text-saldio-ink dark:text-saldio-dark-ink">
        Terjadi Kesalahan
      </Text>
      <Text className="mt-2 text-center font-sans text-sm text-saldio-muted dark:text-saldio-dark-muted">
        {error?.message || "Kesalahan tidak diketahui"}
      </Text>
      <Text
        onPress={onReset}
        className="mt-6 font-sans-semibold text-base text-saldio-blue dark:text-saldio-dark-blue active:opacity-70"
      >
        Coba Lagi
      </Text>
    </View>
  );
}
