import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'state/auth_state.dart';
import 'theme.dart';
import 'screens/splash_screen.dart';
import 'screens/role_select_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_worker_screen.dart';
import 'screens/register_client_screen.dart';
import 'screens/worker/worker_home_screen.dart';
import 'screens/client/client_home_screen.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => AuthState()..loadSession(),
      child: const ManpowerApp(),
    ),
  );
}

class ManpowerApp extends StatelessWidget {
  const ManpowerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Yukti Solutions',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      initialRoute: '/',
      routes: {
        '/': (_) => const SplashScreen(),
        '/role-select': (_) => const RoleSelectScreen(),
        '/login': (_) => const LoginScreen(),
        '/register/worker': (_) => const RegisterWorkerScreen(),
        '/register/client': (_) => const RegisterClientScreen(),
        '/worker': (_) => const WorkerHomeScreen(),
        '/client': (_) => const ClientHomeScreen(),
      },
    );
  }
}
