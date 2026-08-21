import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:manpower_mobile/main.dart';
import 'package:manpower_mobile/state/auth_state.dart';

void main() {
  testWidgets('shows the role selection screen when logged out', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => AuthState()..loadSession(),
        child: const ManpowerApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Hire a worker'), findsOneWidget);
    expect(find.text('Find work'), findsOneWidget);
  });
}
