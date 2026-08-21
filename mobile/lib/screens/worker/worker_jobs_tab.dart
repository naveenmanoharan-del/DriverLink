import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/models.dart';
import '../../services/api_client.dart';
import '../../state/auth_state.dart';
import '../../theme.dart';
import '../../widgets/app_button.dart';
import '../../widgets/fade_in.dart';
import '../../widgets/status_chip.dart';
import '../../widgets/load_error.dart';

class WorkerJobsTab extends StatefulWidget {
  const WorkerJobsTab({super.key});

  @override
  State<WorkerJobsTab> createState() => _WorkerJobsTabState();
}

class _WorkerJobsTabState extends State<WorkerJobsTab> {
  final _api = ApiClient();
  List<Job> _jobs = [];
  bool _loading = true;
  String? _status;
  String? _loadError;

  /// Jobs this worker has already applied to. The backend allows exactly one
  /// application per job per worker, so these can never be applied to again.
  Set<String> _appliedJobIds = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    final auth = context.read<AuthState>();
    try {
      final result =
          await _api.get('/v1/jobs?status=open') as Map<String, dynamic>;
      final data = result['data'] as List<dynamic>;

      // Load our own applications too, so already-applied jobs render as such
      // instead of offering an Apply button that can only fail.
      var applied = <String>{};
      try {
        final mine =
            await _api.get('/v1/applications/mine', token: auth.accessToken)
                as List<dynamic>;
        applied =
            mine
                .map((e) => (e as Map<String, dynamic>)['jobId'] as String)
                .toSet();
      } catch (_) {
        // Non-fatal: worst case the button stays enabled and the API rejects it.
      }

      if (!mounted) return;
      setState(() {
        _jobs =
            data.map((e) => Job.fromJson(e as Map<String, dynamic>)).toList();
        _appliedJobIds = applied;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadError = messageFor(e, 'Could not load open jobs.'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _apply(Job job) async {
    final result = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      builder: (context) => _ApplySheet(job: job),
    );
    if (result == null || !mounted) return;

    final auth = context.read<AuthState>();
    try {
      await _api.post(
        '/v1/jobs/${job.id}/applications',
        token: auth.accessToken,
        body: {
          'proposedRate': result['proposedRate'],
          if ((result['message'] ?? '').isNotEmpty)
            'message': result['message'],
        },
      );
      if (!mounted) return;
      setState(() {
        _status = 'Application submitted for "${job.title}".';
        _appliedJobIds = {..._appliedJobIds, job.id};
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _status = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Open jobs'),
        automaticallyImplyLeading: false,
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child:
            _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (_status != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(
                          _status!,
                          style: dataStyle(
                            size: 13,
                            color: AppColors.stampDark,
                          ),
                        ),
                      ),
                    if (_loadError != null)
                      LoadError(message: _loadError!, onRetry: _load)
                    else if (_jobs.isEmpty)
                      Text(
                        'No open jobs right now.',
                        style: dataStyle(size: 13, color: AppColors.slate),
                      ),
                    if (_loadError == null)
                      for (final (index, job) in _jobs.indexed)
                        FadeIn(
                          // Cap the stagger so long lists don't trail off.
                          delay: Duration(
                            milliseconds: 60 * (index.clamp(0, 8)),
                          ),
                          child: Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          job.title,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w800,
                                            fontSize: 16,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          job.location,
                                          style: const TextStyle(
                                            color: AppColors.slate,
                                            fontSize: 13,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${job.currency} ${job.offeredRate} / ${job.rateUnit}',
                                          style: dataStyle(size: 13),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  if (_appliedJobIds.contains(job.id))
                                    const StatusChip(status: 'applied')
                                  else
                                    AppButton(
                                      label: 'Apply',
                                      onPressed: () => _apply(job),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        ),
                  ],
                ),
      ),
    );
  }
}

class _ApplySheet extends StatefulWidget {
  final Job job;
  const _ApplySheet({required this.job});

  @override
  State<_ApplySheet> createState() => _ApplySheetState();
}

class _ApplySheetState extends State<_ApplySheet> {
  final _rateController = TextEditingController();
  final _messageController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Apply to "${widget.job.title}"',
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _rateController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Your proposed rate'),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _messageController,
            maxLines: 2,
            decoration: const InputDecoration(labelText: 'Message (optional)'),
          ),
          const SizedBox(height: 20),
          AppButton(
            label: 'Submit application',
            onPressed:
                _rateController.text.isEmpty
                    ? null
                    : () => Navigator.of(context).pop({
                      'proposedRate': _rateController.text,
                      'message': _messageController.text,
                    }),
          ),
        ],
      ),
    );
  }
}
