import React from 'react';
import { StyleSheet, SafeAreaView, Platform, StatusBar, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

// In production, this would be the actual deployed URL
const DASHBOARD_URL = 'https://gentleman-custard-observant.ngrok-free.dev';

export default function App() {
  const [loading, setLoading] = React.useState(true);

  return (
    <SafeAreaView style={styles.container}>
      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      )}
      <WebView 
        source={{ uri: DASHBOARD_URL }} 
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        bounces={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  webview: {
    flex: 1,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  }
});
