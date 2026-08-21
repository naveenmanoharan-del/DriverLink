import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/auth_state.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthState>(
      builder: (context, auth, _) {
        if (auth.loading) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!auth.isAuthenticated) {
            Navigator.of(context).pushReplacementNamed('/role-select');
          } else if (auth.user!.role == 'worker') {
            Navigator.of(context).pushReplacementNamed('/worker');
          } else {
            Navigator.of(context).pushReplacementNamed('/client');
          }
        });
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      },
    );
  }
}
