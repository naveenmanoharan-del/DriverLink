import 'package:flutter/material.dart';
import '../theme.dart';

enum AppButtonVariant { primary, secondary }

class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final bool expand;
  final bool loading;

  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.expand = false,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    // Cross-fade between label and spinner so the button doesn't jump when a
    // submit starts.
    final child = AnimatedSwitcher(
      duration: const Duration(milliseconds: 200),
      child:
          loading
              ? const SizedBox(
                key: ValueKey('loading'),
                height: 18,
                width: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.card,
                ),
              )
              : Text(
                label,
                key: const ValueKey('label'),
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 15,
                ),
              ),
    );

    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(999),
      side:
          variant == AppButtonVariant.secondary
              ? const BorderSide(color: AppColors.slateLight)
              : BorderSide.none,
    );

    final button =
        variant == AppButtonVariant.primary
            ? FilledButton(
              onPressed: loading ? null : onPressed,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.signal,
                foregroundColor: AppColors.card,
                disabledBackgroundColor: AppColors.signal.withValues(
                  alpha: 0.4,
                ),
                padding: const EdgeInsets.symmetric(
                  vertical: 16,
                  horizontal: 24,
                ),
                shape: shape,
              ),
              child: child,
            )
            : OutlinedButton(
              onPressed: loading ? null : onPressed,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.ink,
                padding: const EdgeInsets.symmetric(
                  vertical: 16,
                  horizontal: 24,
                ),
                shape: shape,
              ),
              child: child,
            );

    return expand ? SizedBox(width: double.infinity, child: button) : button;
  }
}
