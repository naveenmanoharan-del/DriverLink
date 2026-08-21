import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets/app_button.dart';
import '../widgets/fade_in.dart';

class RoleSelectScreen extends StatelessWidget {
  const RoleSelectScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Staggered entrance mirroring the website hero.
              FadeIn(
                child: Text(
                  'Manpower, on record',
                  style: dataStyle(
                    size: 14,
                    weight: FontWeight.w500,
                    color: AppColors.slate,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              FadeIn(
                delay: const Duration(milliseconds: 100),
                child: Text(
                  'Every worker,\nverified and on\nthe books.',
                  style: displayStyle(size: 38),
                ),
              ),
              const SizedBox(height: 16),
              const FadeIn(
                delay: Duration(milliseconds: 220),
                child: Text(
                  'Yukti Solutions is where clients hire and workers get hired — labour, drivers, '
                  'artisans, office staff — with an ID, a day-rate, and a verification stamp behind '
                  'every name.',
                  style: TextStyle(
                    color: AppColors.slate,
                    height: 1.4,
                    fontSize: 15,
                  ),
                ),
              ),
              const SizedBox(height: 36),
              FadeIn(
                delay: const Duration(milliseconds: 340),
                child: AppButton(
                  label: 'Hire a worker',
                  expand: true,
                  onPressed:
                      () => Navigator.of(context).pushNamed('/register/client'),
                ),
              ),
              const SizedBox(height: 12),
              FadeIn(
                delay: const Duration(milliseconds: 420),
                child: AppButton(
                  label: "Find work",
                  variant: AppButtonVariant.secondary,
                  expand: true,
                  onPressed:
                      () => Navigator.of(context).pushNamed('/register/worker'),
                ),
              ),
              const SizedBox(height: 24),
              FadeIn(
                delay: const Duration(milliseconds: 500),
                child: Center(
                  child: TextButton(
                    onPressed: () => Navigator.of(context).pushNamed('/login'),
                    child: const Text(
                      'Already have an account? Log in',
                      style: TextStyle(
                        color: AppColors.signalDark,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
