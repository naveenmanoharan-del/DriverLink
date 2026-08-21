import 'package:flutter/material.dart';
import '../theme.dart';
import 'app_button.dart';

/// Shown when a list failed to load.
///
/// Without this a failed request falls through to the empty state, telling
/// someone they have no jobs when the request simply did not come back.
class LoadError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const LoadError({super.key, required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            message,
            style: const TextStyle(color: AppColors.warn, fontSize: 14),
          ),
          const SizedBox(height: 12),
          AppButton(
            label: 'Try again',
            variant: AppButtonVariant.secondary,
            onPressed: onRetry,
          ),
        ],
      ),
    );
  }
}

/// Turns a thrown value into something worth showing a person.
String messageFor(Object error, String fallback) {
  final text = error.toString();
  // http throws SocketException/ClientException when the server is unreachable.
  if (text.contains('SocketException') ||
      text.contains('Connection refused') ||
      text.contains('Failed host lookup') ||
      text.contains('ClientException')) {
    return "Can't reach the server. Check your connection and try again.";
  }
  return fallback;
}
