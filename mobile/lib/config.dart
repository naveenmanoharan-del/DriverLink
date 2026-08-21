/// Backend base URL.
///
/// Defaults to 10.0.2.2, which is the Android emulator's alias for the host
/// machine's localhost. For a physical device on the same Wi-Fi network,
/// override with your machine's LAN IP, e.g.:
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.23:3000/api
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000/api',
);
