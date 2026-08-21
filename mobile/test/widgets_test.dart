import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:manpower_mobile/theme.dart';
import 'package:manpower_mobile/widgets/app_button.dart';
import 'package:manpower_mobile/widgets/fade_in.dart';
import 'package:manpower_mobile/widgets/load_error.dart';
import 'package:manpower_mobile/widgets/status_chip.dart';

/// Wraps a widget in the app's theme so styling matches production.
Widget host(Widget child) =>
    MaterialApp(theme: buildAppTheme(), home: Scaffold(body: Center(child: child)));

void main() {
  group('AppButton', () {
    testWidgets('shows its label and fires onPressed', (tester) async {
      var taps = 0;
      await tester.pumpWidget(
        host(AppButton(label: 'Hire a worker', onPressed: () => taps++)),
      );

      expect(find.text('Hire a worker'), findsOneWidget);
      await tester.tap(find.text('Hire a worker'));
      expect(taps, 1);
    });

    testWidgets('swaps the label for a spinner while loading', (tester) async {
      await tester.pumpWidget(
        host(AppButton(label: 'Log in', loading: true, onPressed: () {})),
      );
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Log in'), findsNothing);
    });

    testWidgets('is inert while loading', (tester) async {
      var taps = 0;
      await tester.pumpWidget(
        host(AppButton(label: 'Submit', loading: true, onPressed: () => taps++)),
      );
      await tester.pump(const Duration(milliseconds: 300));

      await tester.tap(find.byType(AppButton));
      expect(taps, 0, reason: 'a loading button must not submit twice');
    });

    testWidgets('is inert when onPressed is null', (tester) async {
      await tester.pumpWidget(host(const AppButton(label: 'Post job', onPressed: null)));
      // Tapping must not throw.
      await tester.tap(find.byType(AppButton));
      expect(find.text('Post job'), findsOneWidget);
    });
  });

  group('StatusChip', () {
    testWidgets('renders the status with underscores humanised', (tester) async {
      await tester.pumpWidget(host(const StatusChip(status: 'in_progress')));
      expect(find.text('in progress'), findsOneWidget);
    });

    testWidgets('falls back to a neutral colour for unknown statuses', (tester) async {
      await tester.pumpWidget(host(const StatusChip(status: 'something_new')));
      // Must render rather than throw on a status the client doesn't know yet.
      expect(find.text('something new'), findsOneWidget);
    });

    testWidgets('uses the accepted colour for applied', (tester) async {
      await tester.pumpWidget(host(const StatusChip(status: 'applied')));
      final text = tester.widget<Text>(find.text('applied'));
      expect(text.style?.color, AppColors.stampDark);
    });
  });

  group('LoadError', () {
    testWidgets('shows the message and retries on tap', (tester) async {
      var retries = 0;
      await tester.pumpWidget(
        host(LoadError(message: 'Could not load open jobs.', onRetry: () => retries++)),
      );

      expect(find.text('Could not load open jobs.'), findsOneWidget);
      await tester.tap(find.text('Try again'));
      expect(retries, 1);
    });
  });

  group('messageFor', () {
    test('explains an unreachable server rather than leaking the exception', () {
      final msg = messageFor(
        Exception('SocketException: Connection refused (OS Error: ...)'),
        'fallback',
      );
      expect(msg, contains("Can't reach the server"));
    });

    test('falls back for errors it cannot interpret', () {
      expect(messageFor(Exception('boom'), 'Could not load your applications.'),
          'Could not load your applications.');
    });
  });

  group('FadeIn', () {
    testWidgets('ends fully visible', (tester) async {
      await tester.pumpWidget(host(const FadeIn(child: Text('Every worker'))));
      await tester.pumpAndSettle();

      final opacity = tester.widget<Opacity>(
        find.ancestor(of: find.text('Every worker'), matching: find.byType(Opacity)).first,
      );
      expect(opacity.opacity, 1.0);
    });

    testWidgets('still resolves when given a delay', (tester) async {
      await tester.pumpWidget(
        host(
          const FadeIn(
            delay: Duration(milliseconds: 200),
            child: Text('Delayed'),
          ),
        ),
      );
      await tester.pumpAndSettle(const Duration(seconds: 1));

      final opacity = tester.widget<Opacity>(
        find.ancestor(of: find.text('Delayed'), matching: find.byType(Opacity)).first,
      );
      expect(opacity.opacity, 1.0, reason: 'delayed content must not stay invisible');
    });
  });
}
