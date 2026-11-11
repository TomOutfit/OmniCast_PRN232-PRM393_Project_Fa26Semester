// OmniCast - AI Curator Screen (Staff/Admin)
// ============================================================
//
// Mobile equivalent of the web `StudioCuratorPage`. Calls the backend
// `AiCuratorController` for all three modes plus history.
//
// Modes wired up:
//   1. PREVIEW  — Mode 2: ad-hoc analysis with manual field entry.
//                  Nothing is persisted server-side.
//   2. CURATE   — Mode 1: existing program, persist report.
//                  Not exposed directly on mobile (staff should
//                  use the web UI for bulk curation).
//   3. APPLY    — Mode 3: push suggestions to the program.
//
// RBAC: the router already guards this route — only STAFF (1) or
// ADMIN (3) can reach this screen.
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/di/injection.dart';
import '../../../core/i18n/app_locale.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/repositories/ai_curator_repository.dart';
import '../../../data/repositories/programs_repository.dart';
import '../../../data/services/free_ai_service.dart';
import '../../../logic/auth/auth_bloc.dart';
import '../../widgets/gemini_key_dialog.dart';
import 'ai_curator_chatbot_sheet.dart';

/// Parse a slot string like "21:00 - 23:00" → ISO 8601 timestamp on
/// the same day as [fallback]. Returns `null` when the slot string is
/// empty, malformed, or contains no `\d{1,2}:\d{2}` pattern.
///
/// Public so it can be unit-tested without instantiating the screen.
String? parseSuggestedTime(String slot, DateTime fallback) {
  final match = RegExp(r'(\d{1,2}):(\d{2})').firstMatch(slot);
  if (match == null) return null;
  final hh = int.tryParse(match[1] ?? '');
  final mm = int.tryParse(match[2] ?? '');
  if (hh == null || mm == null) return null;

  return DateTime(
    fallback.year,
    fallback.month,
    fallback.day,
    hh,
    mm,
  ).toIso8601String();
}

class AICuratorScreen extends StatefulWidget {
  const AICuratorScreen({super.key});

  @override
  State<AICuratorScreen> createState() => _AICuratorScreenState();
}

class _AICuratorScreenState extends State<AICuratorScreen>
    with SingleTickerProviderStateMixin {
  late final AiCuratorRepository _curatorRepo;
  late final ProgramsRepository _programsRepo;

  // ── State ─────────────────────────────────────────────────
  bool _isLoading = false;
  String? _error;
  AiCuratorReport? _result;

  // Draft form state
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _channelController = TextEditingController();
  final _durationController = TextEditingController();

  // Programs list (for apply-curation flow)
  List<_ScheduledProgram> _programs = [];
  _ScheduledProgram? _selectedProgram;

  // History
  List<AiCuratorReport> _history = [];
  bool _historyOpen = false;

  // Apply state
  bool _applying = false;
  String? _applySuccess;

  // Pipeline Stats
  AiCuratorStatsModel? _stats;

  // Free AI & Chatbot
  final _freeAiService = FreeAiService();
  bool _useFreeAi = false;
  FreeAiModel _selectedFreeModel = FreeAiModel.geminiPro;

  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _curatorRepo = getIt<AiCuratorRepository>();
    _programsRepo = getIt<ProgramsRepository>();
    _tabController = TabController(length: 3, vsync: this);
    _loadPrograms();
    _loadStats();
    _loadGeminiKey();
  }

  Future<void> _loadGeminiKey() async {
    try {
      final storage = getIt<FlutterSecureStorage>();
      final saved =
          await storage.read(key: AppConstants.geminiApiKeyStorageKey);
      if (saved != null && saved.isNotEmpty) {
        AppConstants.setGeminiApiKey(saved);
        if (mounted) setState(() {});
      }
    } catch (_) {}
  }

  void _openChatbot() {
    AICuratorChatbotSheet.show(
      context,
      currentTitle: _titleController.text.trim().isNotEmpty
          ? _titleController.text.trim()
          : _selectedProgram?.title,
      currentDescription: _descController.text.trim().isNotEmpty
          ? _descController.text.trim()
          : _selectedProgram?.description,
      currentChannel: _channelController.text.trim().isNotEmpty
          ? _channelController.text.trim()
          : _selectedProgram?.channelName,
      onApplyToCurator: (title, description) {
        setState(() {
          if (title.isNotEmpty) _titleController.text = title;
          if (description.isNotEmpty) _descController.text = description;
          if (_error != null) _error = null;
        });
      },
    );
  }

  Future<void> _loadStats() async {
    try {
      final s = await _curatorRepo.stats();
      if (mounted) setState(() => _stats = s);
    } catch (_) {
      // Gracefully ignore (especially in tests where stats is unmocked)
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _channelController.dispose();
    _durationController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadPrograms() async {
    try {
      // Fetch SCHEDULED programs for the "apply" flow. We use
      // `getPrograms` (paginated) so the curator can pick from a
      // realistic EPG window rather than only currently-airing items.
      final page = await _programsRepo.getPrograms(
        status: 'SCHEDULED',
        page: 1,
        limit: 50,
      );
      if (mounted) {
        final next = page.items
            .map((e) => _ScheduledProgram(
                  id: e.id,
                  title: e.title,
                  description: e.description ?? '',
                  scheduledAt: e.scheduledAt,
                  channelName: e.channel?.name ?? '',
                  status: e.status,
                ))
            .toList(growable: false);
        setState(() {
          _programs = next;
          // Reconcile the previously selected program with the freshly
          // built list. `_ScheduledProgram` uses identity equality so a
          // dangling reference would crash the DropdownButton on rebuild.
          if (_selectedProgram != null) {
            final idx =
                next.indexWhere((p) => p.id == _selectedProgram!.id);
            if (idx >= 0) {
              _selectedProgram = next[idx];
            } else {
              _selectedProgram = null;
              _history = const [];
              _historyOpen = false;
            }
          }
        });
      }
    } catch (_) {
      // Non-fatal — programs are only needed for the "apply" flow.
    }
  }

  Future<void> _runAnalysis() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      setState(() => _error = appT(context, 'curator.errorTitleRequired'));
      return;
    }

    HapticFeedback.lightImpact();
    setState(() {
      _isLoading = true;
      _error = null;
      _result = null;
      _applySuccess = null;
    });

    try {
      // Duration is expressed in MINUTES in the form; the API takes
      // seconds. An unparseable / empty value is simply omitted so the
      // backend treats the duration as unknown.
      final durationMinutes = int.tryParse(_durationController.text.trim());
      final AiCuratorReport report;
      if (_useFreeAi) {
        report = await _freeAiService.analyzeCuratorWithFreeAi(
          title: title,
          description: _descController.text.trim().isEmpty
              ? null
              : _descController.text.trim(),
          channelName: _channelController.text.trim().isEmpty
              ? null
              : _channelController.text.trim(),
          durationMinutes: (durationMinutes != null && durationMinutes > 0)
              ? durationMinutes
              : null,
          model: _selectedFreeModel,
        );
      } else {
        report = await _curatorRepo.analyze(
          title: title,
          description: _descController.text.trim().isEmpty
              ? null
              : _descController.text.trim(),
          channelName: _channelController.text.trim().isEmpty
              ? null
              : _channelController.text.trim(),
          duration: (durationMinutes != null && durationMinutes > 0)
              ? durationMinutes * 60
              : null,
        );
      }

      if (!mounted) return;
      setState(() {
        _result = report;
        _isLoading = false;
      });
    } on AiCuratorException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = _tr(
          context,
          'curator.errorUnknown',
          {'error': e.toString()},
        );
        _isLoading = false;
      });
    }
  }

  Future<void> _loadHistory(String programId) async {
    setState(() => _historyOpen = true);
    try {
      final hist = await _curatorRepo.history(programId);
      if (!mounted) return;
      setState(() => _history = hist);
    } on AiCuratorException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _tr(
              context,
              'curator.errorLoadHistory',
              {'error': e.message},
            ),
          ),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _applyToProgram() async {
    if (_selectedProgram == null || _result == null) return;

    HapticFeedback.lightImpact();
    setState(() {
      _applying = true;
      _applySuccess = null;
    });

    try {
      // Parse suggested start time from "21:00 - 23:00" into ISO timestamp.
      final parsedSlot = _parseSuggestedTime(
        _result!.suggestedTimeSlot,
        _selectedProgram!.scheduledAt,
      );

      await _curatorRepo.apply(
        programId: _selectedProgram!.id,
        scheduledAt: parsedSlot,
        description: _result!.targetAudienceVibe,
      );

      if (!mounted) return;
      setState(() {
        _applySuccess = _tr(
          context,
          'curator.applySuccess',
          {'title': _selectedProgram!.title},
        );
        _applying = false;
      });
    } on AiCuratorException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _applying = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = _tr(
          context,
          'curator.errorApply',
          {'error': e.toString()},
        );
        _applying = false;
      });
    }
  }

  /// Parse "21:00 - 23:00" → ISO timestamp on the same day as `fallback`.
  String? _parseSuggestedTime(String slot, DateTime fallback) {
    return parseSuggestedTime(slot, fallback);
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.read<AuthBloc>().state;
    if (authState is! Authenticated ||
        (authState.user.role != 'STAFF' && authState.user.role != 'ADMIN')) {
      return _buildAccessDenied();
    }

    return Scaffold(
      backgroundColor: const Color(0xFF080B11),
      appBar: AppBar(
        backgroundColor: const Color(0xFF080B11),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFFF8FAFC)),
          onPressed: () => context.canPop() ? context.pop() : context.go('/home'),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              appT(context, 'curator.pageTitle'),
              style: const TextStyle(
                color: Color(0xFFF8FAFC),
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            Text(
              appT(context, 'curator.pageSubtitle'),
              style: const TextStyle(
                color: Color(0xFF00E5FF),
                fontSize: 9,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.1,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Cài đặt Gemini API Key',
            icon: Icon(
              Icons.key_rounded,
              color: AppConstants.geminiApiKey.isNotEmpty
                  ? const Color(0xFF10B981)
                  : const Color(0xFF00E5FF),
            ),
            onPressed: () async {
              await GeminiKeyDialog.show(context);
              if (mounted) setState(() {});
            },
          ),
          IconButton(
            tooltip: 'Trợ lý AI Chatbot',
            icon: const Icon(Icons.smart_toy_outlined, color: Color(0xFF00E5FF)),
            onPressed: _openChatbot,
          ),
          IconButton(
            tooltip: 'Live Studio',
            icon: const Icon(Icons.podcasts_rounded, color: Color(0xFFFF2A55)),
            onPressed: () => context.push('/studio/live'),
          ),
          IconButton(
            icon: const Icon(Icons.info_outline_rounded, color: Color(0xFF00E5FF)),
            onPressed: () => _showInfoDialog(context),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(49),
          child: Column(
            children: [
              TabBar(
                controller: _tabController,
                indicatorColor: const Color(0xFF00E5FF),
                labelColor: const Color(0xFF00E5FF),
                unselectedLabelColor: const Color(0xFF94A3B8),
                tabs: [
                  Tab(text: appT(context, 'curator.analyzeTab')),
                  Tab(text: appT(context, 'curator.applyTab')),
                  Tab(
                    text: appT(
                      context,
                      'curator.curateExistingTab',
                      'Phân tích có sẵn',
                    ),
                  ),
                ],
              ),
              const Divider(height: 1, thickness: 1, color: Color(0x14FFFFFF)),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openChatbot,
        backgroundColor: const Color(0xFF00E5FF),
        foregroundColor: const Color(0xFF080B11),
        icon: const Icon(Icons.smart_toy_rounded, size: 20),
        label: const Text(
          'AI CHATBOT',
          style: TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: 12,
            letterSpacing: 0.5,
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildPreviewTab(),
          _buildApplyTab(),
          _buildCurateExistingTab(),
        ],
      ),
    );
  }

  Widget _buildPreviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(),
          const SizedBox(height: 16),
          _buildAiEngineSelector(),
          const SizedBox(height: 16),
          _buildProgramSelectorDropdown(),
          const SizedBox(height: 16),
          _buildQuickPresets(),
          const SizedBox(height: 16),

          // Title field
          _buildTextField(
            controller: _titleController,
            label: appT(context, 'curator.titleFieldLabel'),
            hint: appT(context, 'curator.titleHint'),
            maxLength: 200,
          ),
          const SizedBox(height: 12),

          // Description field
          _buildTextField(
            controller: _descController,
            label: appT(context, 'curator.descriptionFieldLabel'),
            hint: appT(context, 'curator.descriptionHint'),
            maxLines: 3,
            maxLength: 5000,
          ),
          const SizedBox(height: 12),

          // Channel name field
          _buildTextField(
            controller: _channelController,
            label: appT(context, 'curator.channelFieldLabel'),
            hint: appT(context, 'curator.channelHint'),
          ),
          const SizedBox(height: 12),

          // Duration field (in minutes). Optional — but it lets the
          // model judge pacing and pick a slot that fits.
          _buildTextField(
            controller: _durationController,
            label: appT(context, 'curator.durationFieldLabel'),
            hint: appT(context, 'curator.durationHint'),
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 16),

          // Analyze button
          _buildAnalyzeButton(),
          const SizedBox(height: 16),

          // Error
          if (_error != null) ...[
            _buildError(),
            const SizedBox(height: 16),
          ],

          // Result
          if (_result != null) ...[
            _buildResults(),
            const SizedBox(height: 36),
          ],
        ],
      ),
    );
  }

  Widget _buildApplyTab() {
    if (_programs.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.schedule_rounded,
                size: 56,
                color: AppColors.textMuted,
              ),
              const SizedBox(height: 16),
              Text(
                appT(context, 'curator.emptyApply'),
                style: const TextStyle(
                  color: AppColors.textFaint,
                  fontSize: 14,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                appT(context, 'curator.emptyApplyHint'),
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 12,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        if (_selectedProgram != null) {
          await _loadHistory(_selectedProgram!.id);
        } else {
          await _loadPrograms();
        }
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Result summary (from preview tab)
            if (_result != null) ...[
              _buildResultSummary(_result!),
              const SizedBox(height: 20),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F1523),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0x1F00E5FF)),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.info_outline_rounded,
                      color: Color(0xFF00E5FF),
                      size: 20,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        appT(context, 'curator.runAnalysisFirst'),
                        style: const TextStyle(
                          color: AppColors.textFaint,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],

            // Program selector
            Text(
              appT(context, 'curator.selectProgram'),
              style: const TextStyle(
                fontSize: 11,
                fontFamily: 'JetBrainsMono',
                fontWeight: FontWeight.w700,
                color: Color(0xFF00E5FF),
                letterSpacing: 1.1,
              ),
            ),
            const SizedBox(height: 8),

            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: const Color(0xFF0F1523),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
              ),
              child: DropdownButton<_ScheduledProgram>(
                value: _selectedProgram,
                hint: Text(
                  appT(context, 'curator.selectProgramHint'),
                  style: const TextStyle(color: AppColors.textFaint),
                ),
                isExpanded: true,
                underline: const SizedBox(),
                dropdownColor: const Color(0xFF0F1523),
                icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF00E5FF)),
                items: _programs.map((p) {
                  return DropdownMenuItem(
                    value: p,
                    child: Text(
                      p.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  );
                }).toList(),
                onChanged: (val) {
                  setState(() {
                    _selectedProgram = val;
                    _applySuccess = null;
                  });
                  if (val != null) {
                    _loadHistory(val.id);
                  }
                },
              ),
            ),
            const SizedBox(height: 16),

            // Apply button
            if (_selectedProgram != null && _result != null)
              _buildApplyButton(),
            const SizedBox(height: 12),

            // Success message
            if (_applySuccess != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.success.withValues(alpha: 0.4),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.check_circle_rounded,
                      color: AppColors.success,
                      size: 20,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _applySuccess!,
                        style: const TextStyle(
                          color: AppColors.success,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // History
            if (_historyOpen) _buildHistorySection(),
          ],
        ),
      ),
    );
  }

  /// 3rd tab — list SCHEDULED programs and let staff trigger `curate()`
  /// against any of them. The persisted report is then shown in the
  /// shared result widgets (so staff can flip back to "Apply suggestions"
  /// to push the suggestion to the same program).
  Widget _buildCurateExistingTab() {
    if (_programs.isEmpty) {
      return RefreshIndicator(
        onRefresh: () async {
          await _loadPrograms();
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          children: [
            // Keep the AI result visible across tab flips — if the
            // staff has just run an analysis on tab 1, jumping to the
            // Curate-existing tab should still show what they got.
            if (_result != null) ...[
              _buildResultSummary(_result!),
              const SizedBox(height: 16),
            ],
            SizedBox(
              height: MediaQuery.of(context).size.height * 0.55,
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.auto_awesome_outlined,
                        size: 56,
                        color: AppColors.textMuted,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        appT(
                          context,
                          'curator.emptyCurateExisting',
                          'Chưa có chương trình nào đang chờ phân tích',
                        ),
                        style: const TextStyle(
                          color: AppColors.textFaint,
                          fontSize: 14,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        appT(
                          context,
                          'curator.emptyCurateExistingHint',
                          'Các chương trình ở trạng thái SCHEDULED sẽ xuất hiện tại đây.',
                        ),
                        style: const TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 12,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        await _loadPrograms();
        if (_selectedProgram != null) {
          await _loadHistory(_selectedProgram!.id);
        }
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // Result summary (same shared widget as the Apply tab — so
          // the curator can flip between "Apply suggestions" and "Curate
          // existing" without losing the just-computed report).
          if (_result != null) ...[
            _buildResultSummary(_result!),
            const SizedBox(height: 20),
          ],

          // Section header
          Text(
            appT(
              context,
              'curator.curateExistingTab',
              'Phân tích có sẵn',
            ),
            style: const TextStyle(
              fontSize: 11,
              fontFamily: 'JetBrainsMono',
              fontWeight: FontWeight.w700,
              color: Color(0xFF00E5FF),
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 8),

          // Programs list with per-row AI button
          ...(_programs.map((p) => _buildCurateExistingRow(p))),

          // History section (also under RefreshIndicator so pull works here)
          if (_historyOpen) ...[
            const SizedBox(height: 20),
            _buildHistorySection(),
          ],

          const SizedBox(height: 36),
        ],
      ),
    );
  }

  Widget _buildCurateExistingRow(_ScheduledProgram p) {
    final isSelectedWithResult = _selectedProgram?.id == p.id && _result != null;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1523),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isSelectedWithResult
              ? const Color(0xFF00E5FF).withValues(alpha: 0.6)
              : const Color(0x14FFFFFF),
          width: 0.8,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF00E5FF).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.live_tv_rounded,
                  color: Color(0xFF00E5FF),
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      p.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (p.channelName.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        p.channelName,
                        style: const TextStyle(
                          color: AppColors.textFaint,
                          fontSize: 11,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: _isLoading
                    ? null
                    : () async {
                        HapticFeedback.lightImpact();
                        setState(() {
                          _isLoading = true;
                          _error = null;
                        });
                        try {
                          final report = await _curatorRepo.curate(
                            programId: p.id,
                            forceRefresh: true,
                          );
                          if (!mounted) return;
                          setState(() {
                            _result = report;
                            _selectedProgram = p;
                            _isLoading = false;
                          });
                          // Auto-load history for the freshly-curated program.
                          await _loadHistory(p.id);
                        } on AiCuratorException catch (e) {
                          if (!mounted) return;
                          setState(() {
                            _error = e.message;
                            _isLoading = false;
                          });
                        } catch (e) {
                          if (!mounted) return;
                          setState(() {
                            _error = _tr(
                              context,
                              'curator.errorUnknown',
                              {'error': e.toString()},
                            );
                            _isLoading = false;
                          });
                        }
                      },
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF00E5FF),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (_isLoading && _selectedProgram?.id == p.id)
                        const SizedBox(
                          width: 12,
                          height: 12,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.black,
                          ),
                        )
                      else
                        const Icon(
                          Icons.auto_awesome,
                          color: Colors.black,
                          size: 14,
                        ),
                      const SizedBox(width: 6),
                      Text(
                        appT(context, 'curator.runAnalysisBtn', 'Phân tích AI'),
                        style: const TextStyle(
                          color: Colors.black,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'Outfit',
                          letterSpacing: 0.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          if (isSelectedWithResult) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF131B2E),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0x14FFFFFF)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          'Khung giờ vàng AI: ${_result!.suggestedTimeSlot}',
                          style: const TextStyle(
                            color: Color(0xFF00E5FF),
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      if (_result!.scoringBreakdown != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: _gradeBgColor(_result!.scoringBreakdown!.grade),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '${_result!.scoringBreakdown!.overallScore}đ · Hạng ${_result!.scoringBreakdown!.grade}',
                            style: TextStyle(
                              color: _gradeTextColor(_result!.scoringBreakdown!.grade),
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                    ],
                  ),
                  if (_result!.targetAudienceVibe.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      _result!.targetAudienceVibe,
                      style: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 11,
                      ),
                    ),
                  ],
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    height: 38,
                    child: ElevatedButton.icon(
                      onPressed: _applying ? null : _applyToProgram,
                      icon: _applying
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.black,
                              ),
                            )
                          : const Icon(Icons.bolt_rounded, size: 16),
                      label: Text(
                        _applying
                            ? 'Đang áp dụng...'
                            : 'ÁP DỤNG VÀO LỊCH CHIẾU NGAY',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00E5FF),
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ── UI Builders ─────────────────────────────────────────────

  Widget _buildAiEngineSelector() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1523),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _useFreeAi
              ? const Color(0xFF00E5FF).withValues(alpha: 0.4)
              : const Color(0x14FFFFFF),
          width: 0.8,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: (_useFreeAi
                          ? const Color(0xFF10B981)
                          : const Color(0xFF00E5FF))
                      .withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  _useFreeAi ? Icons.cloud_done_rounded : Icons.memory_rounded,
                  size: 16,
                  color: _useFreeAi
                      ? const Color(0xFF10B981)
                      : const Color(0xFF00E5FF),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _useFreeAi
                          ? 'MÔ HÌNH AI MIỄN PHÍ (ZERO-COST)'
                          : 'MÁY CHỦ OMNICAST AI (MẶC ĐỊNH)',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        fontFamily: 'JetBrainsMono',
                        color: _useFreeAi
                            ? const Color(0xFF10B981)
                            : const Color(0xFF00E5FF),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _useFreeAi
                          ? 'Chạy trực tiếp qua Pollinations AI • Không tốn credit OmniCast'
                          : 'Được vận hành bởi OmniCast NestJS AI Pipeline',
                      style: const TextStyle(
                        fontSize: 10,
                        color: Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              ),
              Switch(
                value: _useFreeAi,
                activeThumbColor: const Color(0xFF10B981),
                inactiveThumbColor: const Color(0xFF94A3B8),
                inactiveTrackColor: const Color(0xFF1E293B),
                onChanged: (val) {
                  HapticFeedback.selectionClick();
                  setState(() => _useFreeAi = val);
                },
              ),
            ],
          ),
          if (_useFreeAi) ...[
            const SizedBox(height: 12),
            const Divider(height: 1, color: Color(0x14FFFFFF)),
            const SizedBox(height: 10),
            const Text(
              'CHỌN MÔ HÌNH AI SỬ DỤNG:',
              style: TextStyle(
                fontSize: 10,
                fontFamily: 'JetBrainsMono',
                fontWeight: FontWeight.w700,
                color: Color(0xFF94A3B8),
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: FreeAiModel.values.map((m) {
                  final isSelected = _selectedFreeModel == m;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      selected: isSelected,
                      onSelected: (selected) {
                        if (selected) {
                          HapticFeedback.selectionClick();
                          setState(() => _selectedFreeModel = m);
                        }
                      },
                      label: Text(
                        m.displayName,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight:
                              isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected ? Colors.black : Colors.white70,
                        ),
                      ),
                      selectedColor: const Color(0xFF00E5FF),
                      backgroundColor: const Color(0xFF131B2E),
                      side: BorderSide(
                        color: isSelected
                            ? const Color(0xFF00E5FF)
                            : const Color(0x14FFFFFF),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 10),
            GestureDetector(
              onTap: () async {
                await GeminiKeyDialog.show(context);
                if (mounted) setState(() {});
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF131B2E),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: AppConstants.geminiApiKey.isNotEmpty
                        ? const Color(0xFF10B981).withValues(alpha: 0.5)
                        : const Color(0x3300E5FF),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.key_rounded,
                      size: 16,
                      color: AppConstants.geminiApiKey.isNotEmpty
                          ? const Color(0xFF10B981)
                          : const Color(0xFF00E5FF),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        AppConstants.geminiApiKey.isNotEmpty
                            ? 'Gemini Key: Đã kết nối • Sẵn sàng suy luận Google Pro'
                            : 'Cài đặt Gemini Key (Miễn phí từ Google AI Studio)',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppConstants.geminiApiKey.isNotEmpty
                              ? const Color(0xFF10B981)
                              : const Color(0xFFF8FAFC),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios_rounded,
                        size: 12, color: Color(0xFF00E5FF)),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 10),
          GestureDetector(
            onTap: _openChatbot,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF131B2E),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0x1F00E5FF)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.smart_toy_rounded,
                      size: 16, color: Color(0xFF00E5FF)),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Mở Trợ lý AI Chatbot để thảo luận & tối ưu kịch bản',
                      style: TextStyle(
                        fontSize: 11,
                        color: Color(0xFFF8FAFC),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  Icon(Icons.arrow_forward_ios_rounded,
                      size: 12, color: Color(0xFF00E5FF)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgramSelectorDropdown() {
    // Reconcile selected program with current _programs list for dropdown safety
    _ScheduledProgram? effectiveSelected;
    if (_selectedProgram != null && _programs.isNotEmpty) {
      final idx = _programs.indexWhere((p) => p.id == _selectedProgram!.id);
      if (idx >= 0) {
        effectiveSelected = _programs[idx];
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Row(
              children: [
                Icon(Icons.video_library_rounded, size: 14, color: Color(0xFF00E5FF)),
                SizedBox(width: 6),
                Text(
                  'CHỌN CHƯƠNG TRÌNH TỪ KHO (EPG)',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF00E5FF),
                    letterSpacing: 0.8,
                  ),
                ),
              ],
            ),
            if (effectiveSelected != null)
              GestureDetector(
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() {
                    _selectedProgram = null;
                    _titleController.clear();
                    _descController.clear();
                    _channelController.clear();
                    _durationController.clear();
                    if (_error != null) _error = null;
                  });
                },
                child: const Row(
                  children: [
                    Icon(Icons.close_rounded, size: 14, color: Color(0xFF94A3B8)),
                    SizedBox(width: 4),
                    Text(
                      'Xóa chọn',
                      style: TextStyle(
                        fontSize: 11,
                        color: Color(0xFF94A3B8),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
        const SizedBox(height: 6),
        const Text(
          'Chọn chương trình có sẵn trong kho để tự động nạp kịch bản vào AI Curator, hoặc tự nhập kịch bản bên dưới.',
          style: TextStyle(
            fontSize: 11,
            color: Color(0xFF64748B),
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
          decoration: BoxDecoration(
            color: const Color(0xFF0F1523),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: effectiveSelected != null
                  ? const Color(0xFF00E5FF).withValues(alpha: 0.6)
                  : const Color(0x14FFFFFF),
              width: 0.8,
            ),
          ),
          child: DropdownButton<_ScheduledProgram?>(
            value: effectiveSelected,
            isExpanded: true,
            underline: const SizedBox(),
            dropdownColor: const Color(0xFF0F1523),
            icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF00E5FF)),
            hint: const Row(
              children: [
                Icon(Icons.video_library_outlined, size: 16, color: Color(0xFF94A3B8)),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '-- Chọn chương trình có sẵn trong kho --',
                    style: TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 13,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            items: [
              const DropdownMenuItem<_ScheduledProgram?>(
                value: null,
                child: Row(
                  children: [
                    Icon(Icons.edit_note_rounded, size: 16, color: Color(0xFF94A3B8)),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '✏️ Soạn thảo kịch bản mới (Tự do)',
                        style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              ..._programs.map((p) {
                return DropdownMenuItem<_ScheduledProgram?>(
                  value: p,
                  child: Row(
                    children: [
                      const Icon(Icons.live_tv_rounded, size: 16, color: Color(0xFF00E5FF)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${p.title}${p.channelName.isNotEmpty ? ' · [${p.channelName}]' : ''}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
            onChanged: (val) {
              HapticFeedback.selectionClick();
              setState(() {
                _selectedProgram = val;
                if (val != null) {
                  _titleController.text = val.title;
                  _descController.text = val.description;
                  _channelController.text = val.channelName;
                  _durationController.text = '45';
                }
                if (_error != null) _error = null;
              });
              if (val != null) {
                _loadHistory(val.id);
              }
            },
          ),
        ),
      ],
    );
  }

  Widget _buildQuickPresets() {
    final presets = [
      {
        'chip': '🎬 Phim tài liệu 4K',
        'title': 'Hùng Vĩ Đại Ngàn: Khám Phá Rừng Quốc Gia Cát Tiên',
        'desc': 'Chuyến thám hiểm chuyên sâu về thảm thực vật nhiệt đới, đa dạng sinh học và các loài động vật hoang dã quý hiếm.',
        'channel': 'VTV Special HD',
        'duration': '50',
      },
      {
        'chip': '⚽ Bình luận trực tiếp',
        'title': 'Đại Chiến Ngoại Hạng Anh: Nhận Định Trước Trận Đấu',
        'desc': 'Phân tích chiến thuật, đội hình xuất phát, điểm nóng đối đầu và ý kiến chuyên gia trước giờ bóng lăn.',
        'channel': 'K+ Sport 1',
        'duration': '45',
      },
      {
        'chip': '📰 Thời sự tiêu điểm',
        'title': 'Nhịp Sống Công Nghệ: Bùng Nổ Trí Tuệ Nhân Tạo 2026',
        'desc': 'Điểm tin đổi mới sáng tạo, xu hướng ứng dụng Generative AI trong chuyển đổi số truyền hình và giáo dục.',
        'channel': 'OmniCast News',
        'duration': '30',
      },
      {
        'chip': '🎮 Chung kết Esports',
        'title': 'VCS Mùa Xuân: Trận Chung Kết Tổng Đỉnh Cao',
        'desc': 'Đại chiến phân định ngôi vương quốc gia với dàn tuyển thủ huyền thoại và không khí cuồng nhiệt tại nhà thi đấu.',
        'channel': 'Omni Gaming',
        'duration': '90',
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(Icons.bolt_rounded, size: 14, color: Color(0xFF00E5FF)),
            SizedBox(width: 4),
            Text(
              'MẪU KỊCH BẢN THỬ NGHIỆM NHANH',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                color: Color(0xFF00E5FF),
                letterSpacing: 0.8,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            children: presets.map((p) {
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ActionChip(
                  label: Text(
                    p['chip']!,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  backgroundColor: const Color(0xFF0F1523),
                  side: const BorderSide(color: Color(0x14FFFFFF)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  onPressed: () {
                    HapticFeedback.selectionClick();
                    _titleController.text = p['title']!;
                    _descController.text = p['desc']!;
                    _channelController.text = p['channel']!;
                    _durationController.text = p['duration']!;
                    if (_error != null) setState(() => _error = null);
                  },
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1523),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x14FFFFFF), width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF00E5FF).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0x2900E5FF)),
                ),
                child: const Icon(
                  Icons.auto_awesome,
                  color: Color(0xFF00E5FF),
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      appT(context, 'curator.newAnalysisHeader'),
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'Outfit',
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      appT(context, 'curator.threeAgentHint'),
                      style: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 11,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (_stats != null) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF131B2E),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0x14FFFFFF)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildStatCol('ĐÃ KIỂM ĐỊNH', '${_stats!.totalReports}', const Color(0xFF00E5FF)),
                  Container(width: 1, height: 20, color: const Color(0x14FFFFFF)),
                  _buildStatCol('GIỜ VÀNG', '${_stats!.primeTimeCount}', const Color(0xFFF59E0B)),
                  Container(width: 1, height: 20, color: const Color(0x14FFFFFF)),
                  _buildStatCol('ĐÃ ÁP DỤNG', '${_stats!.programsMarkedApplied}', const Color(0xFF10B981)),
                  Container(width: 1, height: 20, color: const Color(0x14FFFFFF)),
                  _buildStatCol('TỐC ĐỘ AI', '${_stats!.avgProcessingTimeMs}ms', const Color(0xFF94A3B8)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatCol(String label, String value, Color color) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 13,
            fontWeight: FontWeight.w800,
            fontFamily: 'JetBrainsMono',
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF64748B),
            fontSize: 9,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    String? hint,
    int maxLines = 1,
    int? maxLength,
    TextInputType? keyboardType,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            fontSize: 11,
            fontFamily: 'JetBrainsMono',
            fontWeight: FontWeight.w700,
            color: Color(0xFF00E5FF),
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          maxLines: maxLines,
          maxLength: maxLength,
          keyboardType: keyboardType,
          style: const TextStyle(color: Colors.white, fontSize: 14),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 14),
            filled: true,
            fillColor: const Color(0xFF0F1523),
            counterStyle: const TextStyle(color: AppColors.textMuted, fontSize: 10),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 12,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: Color(0x1F00E5FF),
                width: 0.8,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: Color(0xFF00E5FF),
                width: 1.5,
              ),
            ),
          ),
          onChanged: (_) {
            // Clear error on change
            if (_error != null) setState(() => _error = null);
          },
        ),
      ],
    );
  }

  Widget _buildAnalyzeButton() {
    return GestureDetector(
      onTap: _isLoading ? null : _runAnalysis,
      child: Container(
        width: double.infinity,
        height: 48,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF00E5FF), Color(0xFF0072FF)],
          ),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF00E5FF).withValues(alpha: 0.25),
              blurRadius: 14,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_isLoading)
              const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.black,
                ),
              )
            else
              const Icon(Icons.psychology_rounded, color: Colors.black, size: 20),
            const SizedBox(width: 8),
            Text(
              _isLoading
                  ? appT(context, 'curator.analyzingButton')
                  : appT(context, 'curator.runAnalysisButton'),
              style: const TextStyle(
                color: Colors.black,
                fontSize: 13,
                fontWeight: FontWeight.w800,
                fontFamily: 'Outfit',
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _error!,
              style: const TextStyle(color: AppColors.error, fontSize: 12),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, color: AppColors.error, size: 16),
            onPressed: () => setState(() => _error = null),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }

  Widget _buildResults() {
    final r = _result!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Shared result summary header (also shown at the top of the
        // Apply / Curate-existing tabs). Includes the suitability
        // badge, recommended slot, target audience, and the
        // confidence bar when the report carries one.
        _buildResultSummary(r),
        const SizedBox(height: 16),

        // 1. Scoring breakdown (5-dimension OBI score card)
        if (r.scoringBreakdown != null) ...[
          _buildScoringBreakdownCard(r),
          const SizedBox(height: 16),
        ],

        // 2. Content Assessment (Script summary, narrative flow, highlights, strengths & weaknesses)
        if (r.contentAssessment != null) ...[
          _buildContentAssessmentCard(r),
          const SizedBox(height: 16),
        ],

        // 3. Format & Technical Production (Format, pacing, interactivity, A/V specs)
        if (r.formatAssessment != null) ...[
          _buildFormatAssessmentCard(r),
          const SizedBox(height: 16),
        ],

        // 4. Grounding — how closely the report tracks the program
        //    description, with verbatim source quotes and the list of
        //    information the description still lacks.
        if (r.grounding != null) ...[
          _buildGroundingCard(r),
          const SizedBox(height: 16),
        ],

        // Summary card
        _buildSummaryCard(r),
        const SizedBox(height: 16),

        // Suitability + recommended time
        _buildSuitabilityCard(r),
        const SizedBox(height: 16),

        // Sentiment
        _buildSentimentCard(r),
        const SizedBox(height: 16),

        // Compliance
        _buildComplianceCard(r),
        const SizedBox(height: 16),

        // Risk warning
        if (r.riskWarnings.isNotEmpty) ...[
          _buildRiskWarning(r),
          const SizedBox(height: 16),
        ],

        // Apply shortcut
        if (_selectedProgram != null) _buildApplySection(r),
      ],
    );
  }

  Color _gradeBgColor(String grade) {
    switch (grade) {
      case 'S':
        return const Color(0xFFF59E0B).withValues(alpha: 0.2);
      case 'A':
        return AppColors.success.withValues(alpha: 0.2);
      case 'B':
        return const Color(0xFF00E5FF).withValues(alpha: 0.2);
      case 'C':
        return AppColors.warning.withValues(alpha: 0.2);
      case 'D':
      default:
        return AppColors.error.withValues(alpha: 0.2);
    }
  }

  Color _gradeBorderColor(String grade) {
    switch (grade) {
      case 'S':
        return const Color(0xFFF59E0B).withValues(alpha: 0.6);
      case 'A':
        return AppColors.success.withValues(alpha: 0.6);
      case 'B':
        return const Color(0xFF00E5FF).withValues(alpha: 0.6);
      case 'C':
        return AppColors.warning.withValues(alpha: 0.6);
      case 'D':
      default:
        return AppColors.error.withValues(alpha: 0.6);
    }
  }

  Color _gradeTextColor(String grade) {
    switch (grade) {
      case 'S':
        return const Color(0xFFF59E0B);
      case 'A':
        return AppColors.success;
      case 'B':
        return const Color(0xFF00E5FF);
      case 'C':
        return AppColors.warning;
      case 'D':
      default:
        return AppColors.error;
    }
  }

  String _gradeDescription(String grade) {
    switch (grade) {
      case 'S':
        return 'Hạng S · Xuất sắc (Ưu tiên giờ vàng cao điểm)';
      case 'A':
        return 'Hạng A · Rất tốt (Đạt chuẩn phát sóng cao cấp)';
      case 'B':
        return 'Hạng B · Đạt chuẩn (Phát sóng thông thường)';
      case 'C':
        return 'Hạng C · Cần hoàn thiện trước khi phát';
      case 'D':
      default:
        return 'Hạng D · Chưa đạt tiêu chuẩn phát sóng';
    }
  }

  Widget _buildResultSummary(AiCuratorReport r) {
    final sb = r.scoringBreakdown;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0x3300E5FF),
            Color(0x1100E5FF),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFFFF2A55).withValues(alpha: 0.4),
          width: 0.8,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFF2A55).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.auto_awesome,
                  color: Color(0xFFFF2A55),
                  size: 18,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      appT(context, 'curator.aiResultLabel'),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      '${r.aiModelVersion} · ${r.processingTimeMs}ms',
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 11,
                        fontFamily: 'JetBrainsMono',
                      ),
                    ),
                  ],
                ),
              ),
              if (sb != null) ...[
                Container(
                  margin: const EdgeInsets.only(right: 6),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _gradeBgColor(sb.grade),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: _gradeBorderColor(sb.grade)),
                  ),
                  child: Text(
                    '${sb.grade} · ${sb.overallScore}đ',
                    style: TextStyle(
                      color: _gradeTextColor(sb.grade),
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      fontFamily: 'JetBrainsMono',
                    ),
                  ),
                ),
              ],
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: r.isPrimeTime
                      ? AppColors.warning.withValues(alpha: 0.2)
                      : r.isRestricted
                          ? AppColors.error.withValues(alpha: 0.2)
                          : AppColors.success.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: r.isPrimeTime
                        ? AppColors.warning.withValues(alpha: 0.5)
                        : r.isRestricted
                            ? AppColors.error.withValues(alpha: 0.5)
                            : AppColors.success.withValues(alpha: 0.5),
                  ),
                ),
                child: Text(
                  _suitabilityLabel(context, r.broadcastSuitability),
                  style: TextStyle(
                    color: r.isPrimeTime
                        ? AppColors.warning
                        : r.isRestricted
                            ? AppColors.error
                            : AppColors.success,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    fontFamily: 'JetBrainsMono',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            _tr(
              context,
              'curator.recommendedSlot',
              {'slot': r.suggestedTimeSlot},
            ),
            style: const TextStyle(
              color: AppColors.textFaint,
              fontSize: 12,
            ),
          ),
          if (r.targetAudienceVibe.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              r.targetAudienceVibe,
              style: const TextStyle(
                color: Color(0xFF00E5FF),
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          if (r.confidence != null) ...[
            const SizedBox(height: 10),
            _buildConfidenceBar(r.confidence!),
          ],
        ],
      ),
    );
  }

  /// Linear confidence bar shown under the suitability badge.
  ///
  /// Thresholds:
  ///   ≥ 80 → success / green
  ///   50-79 → warning / yellow
  ///   < 50 → error / red
  Widget _buildConfidenceBar(int confidence) {
    final clamped = confidence.clamp(0, 100);
    final value = clamped / 100.0;
    final Color color;
    if (clamped >= 80) {
      color = AppColors.success;
    } else if (clamped >= 50) {
      color = AppColors.warning;
    } else {
      color = AppColors.error;
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.bolt_rounded, size: 14, color: color),
            const SizedBox(width: 6),
            Text(
              _tr(
                context,
                'curator.confidencePercent',
                {'value': clamped.toString()},
              ),
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                fontFamily: 'JetBrainsMono',
                letterSpacing: 0.6,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(
            value: value,
            minHeight: 6,
            backgroundColor: const Color(0x14FFFFFF),
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }

  Widget _buildScoringBreakdownCard(AiCuratorReport r) {
    final sb = r.scoringBreakdown;
    if (sb == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1523),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'CHỈ SỐ ĐÁNH GIÁ ĐA CHIỀU (OBI INDEX)',
                style: TextStyle(
                  fontSize: 11,
                  fontFamily: 'JetBrainsMono',
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF00E5FF),
                  letterSpacing: 0.8,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: _gradeBgColor(sb.grade),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _gradeBorderColor(sb.grade)),
                ),
                child: Text(
                  'Hạng ${sb.grade}',
                  style: TextStyle(
                    color: _gradeTextColor(sb.grade),
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'JetBrainsMono',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Overall OBI banner
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  _gradeBgColor(sb.grade),
                  const Color(0xFF0F172A),
                ],
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _gradeBorderColor(sb.grade).withValues(alpha: 0.4),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: _gradeTextColor(sb.grade), width: 2),
                    color: Colors.black.withValues(alpha: 0.3),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    '${sb.overallScore}',
                    style: TextStyle(
                      color: _gradeTextColor(sb.grade),
                      fontWeight: FontWeight.w900,
                      fontFamily: 'JetBrainsMono',
                      fontSize: 16,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _gradeDescription(sb.grade),
                        style: TextStyle(
                          color: _gradeTextColor(sb.grade),
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Điểm tổng hợp cân đối nội dung, hình thức và chuẩn phát sóng',
                        style: TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // 5 metrics progress bars
          _buildMetricBar('Chất lượng nội dung (Content)', sb.contentQuality, const Color(0xFF00E5FF)),
          const SizedBox(height: 8),
          _buildMetricBar('Giá trị sản xuất (Production)', sb.productionValue, const Color(0xFF38BDF8)),
          const SizedBox(height: 8),
          _buildMetricBar('Sức hút khán giả (Audience)', sb.audienceAppeal, const Color(0xFFA855F7)),
          const SizedBox(height: 8),
          _buildMetricBar('Chuẩn mực & An toàn (Safety)', sb.complianceSafety, AppColors.success),
          const SizedBox(height: 8),
          _buildMetricBar('Tiềm năng thương mại (Commercial)', sb.commercialPotential, const Color(0xFFF59E0B)),
        ],
      ),
    );
  }

  Widget _buildMetricBar(String label, int value, Color color) {
    final clamped = value.clamp(0, 100);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: const TextStyle(
                color: Color(0xFFCBD5E1),
                fontSize: 11,
              ),
            ),
            Text(
              '$clamped%',
              style: TextStyle(
                color: color,
                fontFamily: 'JetBrainsMono',
                fontWeight: FontWeight.w700,
                fontSize: 11,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: clamped / 100.0,
            minHeight: 5,
            backgroundColor: const Color(0x14FFFFFF),
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }

  Widget _buildContentAssessmentCard(AiCuratorReport r) {
    final ca = r.contentAssessment;
    if (ca == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1523),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.description_rounded, color: Color(0xFF00E5FF), size: 16),
              SizedBox(width: 8),
              Text(
                'THẨM ĐỊNH NỘI DUNG CHƯƠNG TRÌNH',
                style: TextStyle(
                  fontSize: 11,
                  fontFamily: 'JetBrainsMono',
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF00E5FF),
                  letterSpacing: 0.8,
                ),
              ),
            ],
          ),
          if (ca.summary.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              ca.summary,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                height: 1.45,
              ),
            ),
          ],
          if (ca.narrativeFlow.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF00E5FF).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0x3300E5FF)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.timeline_rounded, color: Color(0xFF00E5FF), size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      ca.narrativeFlow,
                      style: const TextStyle(
                        color: Color(0xFFE2E8F0),
                        fontSize: 11.5,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (ca.highlights.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text(
              'ĐIỂM NHẤN NỔI BẬT',
              style: TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 10,
                fontFamily: 'JetBrainsMono',
                fontWeight: FontWeight.w700,
                letterSpacing: 0.6,
              ),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: ca.highlights.map((h) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0x1F00E5FF),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0x3300E5FF)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.star_rounded, color: Color(0xFF00E5FF), size: 12),
                    const SizedBox(width: 4),
                    Text(
                      h,
                      style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 11),
                    ),
                  ],
                ),
              )).toList(),
            ),
          ],
          if (ca.strengths.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text(
              'ƯU ĐIỂM CHƯƠNG TRÌNH',
              style: TextStyle(
                color: AppColors.success,
                fontSize: 10,
                fontFamily: 'JetBrainsMono',
                fontWeight: FontWeight.w700,
                letterSpacing: 0.6,
              ),
            ),
            const SizedBox(height: 6),
            ...ca.strengths.map((s) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 14),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(s, style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11.5)),
                  ),
                ],
              ),
            )),
          ],
          if (ca.weaknesses.isNotEmpty) ...[
            const SizedBox(height: 8),
            const Text(
              'ĐIỂM CẦN HOÀN THIỆN',
              style: TextStyle(
                color: AppColors.warning,
                fontSize: 10,
                fontFamily: 'JetBrainsMono',
                fontWeight: FontWeight.w700,
                letterSpacing: 0.6,
              ),
            ),
            const SizedBox(height: 6),
            ...ca.weaknesses.map((w) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline_rounded, color: AppColors.warning, size: 14),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(w, style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11.5)),
                  ),
                ],
              ),
            )),
          ],
        ],
      ),
    );
  }

  /// Grounding card — "Độ bám sát nội dung".
  ///
  /// Shows how closely the report tracks the program description, the
  /// verbatim quotes it was built from, and what information the
  /// description still lacks. The score is recomputed by the
  /// backend, so it is a measure of evidence, not of the model's
  /// self-assessment.
  Widget _buildGroundingCard(AiCuratorReport r) {
    final g = r.grounding;
    if (g == null) return const SizedBox.shrink();

    final score = g.groundingScore.clamp(0, 100);
    final Color color;
    final String verdict;
    if (score >= 70) {
      color = AppColors.success;
      verdict = 'Báo cáo bám sát tốt với mô tả chương trình.';
    } else if (score >= 55) {
      color = AppColors.warning;
      verdict = 'Báo cáo bám sát mô tả ở mức chấp nhận được.';
    } else {
      color = AppColors.error;
      verdict = 'Báo cáo bám sát nội dung yếu — nên rà soát lại mô tả.';
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1523),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.link_rounded,
                color: Color(0xFF00E5FF),
                size: 16,
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'ĐỘ BÁM SÁT NỘI DUNG',
                  style: TextStyle(
                    fontSize: 11,
                    fontFamily: 'JetBrainsMono',
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF00E5FF),
                    letterSpacing: 0.8,
                  ),
                ),
              ),
              Text(
                '$score%',
                style: TextStyle(
                  color: color,
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'JetBrainsMono',
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: score / 100.0,
              minHeight: 6,
              backgroundColor: const Color(0x14FFFFFF),
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            verdict,
            style: const TextStyle(
              color: Color(0xFF8FA3BF),
              fontSize: 11,
              height: 1.4,
            ),
          ),
          if (g.sourceExcerpts.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Text(
              'TRÍCH DẪN TỪ MÔ TẢ NGUỒN',
              style: TextStyle(
                fontSize: 10,
                fontFamily: 'JetBrainsMono',
                fontWeight: FontWeight.w700,
                color: Color(0xFF8FA3BF),
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 6),
            ...g.sourceExcerpts.map(
              (e) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: AppColors.success.withValues(alpha: 0.25),
                      width: 0.8,
                    ),
                  ),
                  child: Text(
                    '"$e"',
                    style: const TextStyle(
                      color: Color(0xFFD6E2F0),
                      fontSize: 11,
                      height: 1.45,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
              ),
            ),
          ],
          if (g.infoGaps.isNotEmpty) ...[
            const SizedBox(height: 8),
            const Text(
              'THIẾU THÔNG TIN TRONG MÔ TẢ',
              style: TextStyle(
                fontSize: 10,
                fontFamily: 'JetBrainsMono',
                fontWeight: FontWeight.w700,
                color: Color(0xFF8FA3BF),
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 6),
            ...g.infoGaps.map(
              (gap) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 5, right: 8),
                      child: Icon(
                        Icons.warning_amber_rounded,
                        size: 12,
                        color: AppColors.warning,
                      ),
                    ),
                    Expanded(
                      child: Text(
                        gap,
                        style: const TextStyle(
                          color: Color(0xFFD6E2F0),
                          fontSize: 11,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFormatAssessmentCard(AiCuratorReport r) {
    final fa = r.formatAssessment;
    if (fa == null) return const SizedBox.shrink();

    String pacingLabel(String p) {
      switch (p) {
        case 'SLOW': return 'Chậm rãi · Sâu lắng';
        case 'MODERATE': return 'Vừa phải · Cân bằng';
        case 'DYNAMIC': return 'Sôi nổi · Biến đổi';
        case 'FAST_PACED': return 'Dồn dập · Kịch tính';
        default: return p;
      }
    }

    String interactivityLabel(String i) {
      switch (i) {
        case 'LOW': return 'Tương tác Thấp';
        case 'MEDIUM': return 'Tương tác Vừa';
        case 'HIGH': return 'Tương tác Cao (Đa nền tảng)';
        default: return i;
      }
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1523),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.layers_rounded, color: Color(0xFF00E5FF), size: 16),
              SizedBox(width: 8),
              Text(
                'THẨM ĐỊNH HÌNH THỨC & DÀN DỰNG KỸ THUẬT',
                style: TextStyle(
                  fontSize: 11,
                  fontFamily: 'JetBrainsMono',
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF00E5FF),
                  letterSpacing: 0.8,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Format Type and badges
          Row(
            children: [
              Expanded(
                child: Text(
                  fa.productionFormat,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.4)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.speed_rounded, color: Color(0xFF38BDF8), size: 12),
                    const SizedBox(width: 4),
                    Text(
                      pacingLabel(fa.pacing),
                      style: const TextStyle(
                        color: Color(0xFF38BDF8),
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFA855F7).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFA855F7).withValues(alpha: 0.4)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.forum_rounded, color: Color(0xFFA855F7), size: 12),
                    const SizedBox(width: 4),
                    Text(
                      interactivityLabel(fa.interactivityLevel),
                      style: const TextStyle(
                        color: Color(0xFFA855F7),
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (fa.visualAudioRequirements.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text(
              'YÊU CẦU HÌNH ẢNH & ÂM THANH',
              style: TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 10,
                fontFamily: 'JetBrainsMono',
                fontWeight: FontWeight.w700,
                letterSpacing: 0.6,
              ),
            ),
            const SizedBox(height: 6),
            ...fa.visualAudioRequirements.map((req) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.tune_rounded, color: Color(0xFF00E5FF), size: 14),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(req, style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11.5)),
                  ),
                ],
              ),
            )),
          ],
          if (fa.technicalRecommendations.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF0B1726),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0x3300E5FF)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.settings_suggest_rounded, color: Color(0xFF00E5FF), size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      fa.technicalRecommendations,
                      style: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 11,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSummaryCard(AiCuratorReport r) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1523),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            appT(context, 'curator.analysisOverview'),
            style: const TextStyle(
              fontSize: 11,
              fontFamily: 'JetBrainsMono',
              fontWeight: FontWeight.w700,
              color: Color(0xFF00E5FF),
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _StatItem(
                  icon: Icons.schedule_rounded,
                  label: appT(context, 'curator.timeSlot'),
                  value: r.suggestedTimeSlot,
                ),
              ),
              Expanded(
                child: _StatItem(
                  icon: Icons.people_rounded,
                  label: appT(context, 'curator.engagement'),
                  value: '${r.sentiment.audienceEngagement}%',
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _StatItem(
                  icon: Icons.category_rounded,
                  label: appT(context, 'curator.broadcastWindow'),
                  value: _broadcastWindowLabel(
                    context,
                    r.compliance.recommendedBroadcastWindow,
                  ),
                ),
              ),
              Expanded(
                child: _StatItem(
                  icon: Icons.shield_rounded,
                  label: appT(context, 'curator.ageLimit'),
                  value: r.compliance.ageRating,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSuitabilityCard(AiCuratorReport r) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1523),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            appT(context, 'curator.broadcastSuitability'),
            style: const TextStyle(
              fontSize: 11,
              fontFamily: 'JetBrainsMono',
              fontWeight: FontWeight.w700,
              color: Color(0xFF00E5FF),
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: r.isPrimeTime
                      ? AppColors.warning.withValues(alpha: 0.15)
                      : r.isRestricted
                          ? AppColors.error.withValues(alpha: 0.15)
                          : const Color(0xFF00E5FF).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  r.isPrimeTime
                      ? Icons.star_rounded
                      : r.isRestricted
                          ? Icons.warning_rounded
                          : Icons.tv_rounded,
                  color: r.isPrimeTime
                      ? AppColors.warning
                      : r.isRestricted
                          ? AppColors.error
                          : const Color(0xFF00E5FF),
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _suitabilityLabel(context, r.broadcastSuitability),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _tr(
                        context,
                        'curator.slotWithValue',
                        {'slot': r.suggestedTimeSlot},
                      ),
                      style: const TextStyle(
                        color: AppColors.textFaint,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (r.targetAudienceVibe.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Divider(color: Color(0x1A00E5FF)),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(
                  Icons.person_rounded,
                  color: Color(0xFF00E5FF),
                  size: 16,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _tr(
                      context,
                      'curator.audienceWithValue',
                      {'audience': r.targetAudienceVibe},
                    ),
                    style: const TextStyle(
                      color: AppColors.textFaint,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSentimentCard(AiCuratorReport r) {
    final sentimentColor = r.sentiment.overallSentiment == 'positive'
        ? AppColors.success
        : r.sentiment.overallSentiment == 'negative'
            ? AppColors.error
            : AppColors.warning;

    final sentimentIcon = r.sentiment.overallSentiment == 'positive'
        ? Icons.thumb_up_rounded
        : r.sentiment.overallSentiment == 'negative'
            ? Icons.thumb_down_rounded
            : Icons.thumbs_up_down_rounded;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1523),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            appT(context, 'curator.sentimentAnalysis'),
            style: const TextStyle(
              fontSize: 11,
              fontFamily: 'JetBrainsMono',
              fontWeight: FontWeight.w700,
              color: Color(0xFF00E5FF),
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _SentimentStat(
                  icon: sentimentIcon,
                  label: appT(context, 'curator.emotion'),
                  value: _sentimentLabel(
                    context,
                    r.sentiment.overallSentiment,
                  ),
                  color: sentimentColor,
                ),
              ),
              Expanded(
                child: _SentimentStat(
                  icon: Icons.local_fire_department_rounded,
                  label: appT(context, 'curator.hypeLevel'),
                  value: r.sentiment.hypeLevel.toUpperCase(),
                  color: AppColors.warning,
                ),
              ),
              Expanded(
                child: _SentimentStat(
                  icon: Icons.bar_chart_rounded,
                  label: appT(context, 'curator.engagement'),
                  value: '${r.sentiment.audienceEngagement}%',
                  color: const Color(0xFF00E5FF),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildComplianceCard(AiCuratorReport r) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1523),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            appT(context, 'curator.complianceAssessment'),
            style: const TextStyle(
              fontSize: 11,
              fontFamily: 'JetBrainsMono',
              fontWeight: FontWeight.w700,
              color: Color(0xFF00E5FF),
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: r.compliance.isAgeRestricted
                      ? AppColors.error.withValues(alpha: 0.2)
                      : AppColors.success.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: r.compliance.isAgeRestricted
                        ? AppColors.error.withValues(alpha: 0.5)
                        : AppColors.success.withValues(alpha: 0.5),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      r.compliance.isAgeRestricted
                          ? Icons.shield_rounded
                          : Icons.verified_rounded,
                      color: r.compliance.isAgeRestricted
                          ? AppColors.error
                          : AppColors.success,
                      size: 16,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      r.compliance.ageRating,
                      style: TextStyle(
                        color: r.compliance.isAgeRestricted
                            ? AppColors.error
                            : AppColors.success,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'JetBrainsMono',
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  _tr(
                    context,
                    'curator.broadcastLabel',
                    {
                      'window': _broadcastWindowLabel(
                        context,
                        r.compliance.recommendedBroadcastWindow,
                      ),
                    },
                  ),
                  style: const TextStyle(
                    color: AppColors.textFaint,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          if (r.compliance.flaggedContent.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: r.compliance.flaggedContent.map((flag) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: AppColors.warning.withValues(alpha: 0.4),
                    ),
                  ),
                  child: Text(
                    flag,
                    style: const TextStyle(
                      color: AppColors.warning,
                      fontSize: 11,
                      fontFamily: 'JetBrainsMono',
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildRiskWarning(AiCuratorReport r) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppColors.error.withValues(alpha: 0.4),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.warning_amber_rounded,
            color: AppColors.error,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  appT(context, 'curator.warning'),
                  style: const TextStyle(
                    color: AppColors.error,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    fontFamily: 'JetBrainsMono',
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  r.riskWarnings,
                  style: const TextStyle(
                    color: AppColors.textFaint,
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildApplySection(AiCuratorReport r) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0x33FF2A55),
            Color(0x1100E5FF),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFFFF2A55).withValues(alpha: 0.4),
          width: 0.8,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.auto_fix_high_rounded,
                color: Color(0xFFFF2A55),
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                appT(context, 'curator.applySuggestionButton'),
                style: const TextStyle(
                  fontSize: 11,
                  fontFamily: 'JetBrainsMono',
                  fontWeight: FontWeight.w700,
                  color: Color(0xFFFF2A55),
                  letterSpacing: 1.1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            _tr(
              context,
              'curator.applyWithSuggestion',
              {
                'slot': r.suggestedTimeSlot,
                'title': _selectedProgram?.title ?? '',
              },
            ),
            style: const TextStyle(
              color: AppColors.textFaint,
              fontSize: 12,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: _applying ? null : _applyToProgram,
            child: Container(
              width: double.infinity,
              height: 40,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFF2A55), Color(0xFF0072FF)],
                ),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: _applying
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        appT(context, 'curator.applySuggestionButton'),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'Outfit',
                          letterSpacing: 0.5,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildApplyButton() {
    return GestureDetector(
      onTap: _applying ? null : _applyToProgram,
      child: Container(
        width: double.infinity,
        height: 48,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFFF2A55), Color(0xFF0072FF)],
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_applying)
              const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            else
              const Icon(Icons.auto_fix_high_rounded,
                  color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Text(
              _applying
                  ? appT(context, 'curator.applyingButton')
                  : appT(context, 'curator.applySuggestionToProgram'),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w800,
                fontFamily: 'Outfit',
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistorySection() {
    if (_history.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Text(
          appT(context, 'curator.emptyHistory'),
          style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          appT(context, 'curator.historyReports'),
          style: const TextStyle(
            fontSize: 11,
            fontFamily: 'JetBrainsMono',
            fontWeight: FontWeight.w700,
            color: Color(0xFF00E5FF),
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 10),
        ...(_history.take(10).map((h) => _buildHistoryItem(h))),
      ],
    );
  }

  Widget _buildHistoryItem(AiCuratorReport h) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0x1F00E5FF), width: 0.6),
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 40,
            decoration: BoxDecoration(
              color: h.isPrimeTime
                  ? AppColors.warning
                  : h.isRestricted
                      ? AppColors.error
                      : const Color(0xFF00E5FF),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_suitabilityLabel(context, h.broadcastSuitability)} · ${h.suggestedTimeSlot}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${h.aiModelVersion} · ${h.processingTimeMs}ms · ${h.tokenUsed ?? 0} tokens',
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 10,
                    fontFamily: 'JetBrainsMono',
                  ),
                ),
                if (h.createdAt != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    _formatDate(h.createdAt!),
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 10,
                      fontFamily: 'JetBrainsMono',
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  // ── i18n helpers ─────────────────────────────────────────────

  /// Translate a key and substitute `{placeholder}` tokens.
  String _tr(BuildContext context, String key, [Map<String, String>? vars]) {
    var s = appT(context, key);
    if (vars != null) {
      vars.forEach((k, v) => s = s.replaceAll('{$k}', v));
    }
    return s;
  }

  String _suitabilityLabel(BuildContext context, String code) {
    switch (code) {
      case 'PRIME_TIME':
        return appT(context, 'curator.suitability.primeTime');
      case 'RESTRICTED':
        return appT(context, 'curator.suitability.restricted');
      default:
        return appT(context, 'curator.suitability.standard');
    }
  }

  String _sentimentLabel(BuildContext context, String code) {
    switch (code) {
      case 'positive':
        return appT(context, 'curator.sentiment.positive');
      case 'negative':
        return appT(context, 'curator.sentiment.negative');
      default:
        return appT(context, 'curator.sentiment.neutral');
    }
  }

  String _broadcastWindowLabel(BuildContext context, String code) {
    switch (code) {
      case 'DAY':
        return appT(context, 'curator.window.day');
      case 'LATE_NIGHT':
        return appT(context, 'curator.window.lateNight');
      default:
        return appT(context, 'curator.window.evening');
    }
  }

  Widget _buildAccessDenied() {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: Text(appT(context, 'curator.accessDeniedAppBar')),
        backgroundColor: AppColors.bg,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AppColors.error.withValues(alpha: 0.4),
                    width: 1,
                  ),
                ),
                child: const Icon(
                  Icons.lock_clock_rounded,
                  size: 56,
                  color: AppColors.error,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                appT(context, 'curator.accessDeniedTitle'),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  fontFamily: 'Outfit',
                  color: Colors.white,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                appT(context, 'curator.accessDeniedMessage'),
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 13,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showInfoDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF0F1523),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0x3300E5FF), width: 0.8),
        ),
        title: Text(
          appT(context, 'curator.infoTitle'),
          style: const TextStyle(
            color: Colors.white,
            fontFamily: 'Outfit',
            fontWeight: FontWeight.w700,
          ),
        ),
        content: Text(
          appT(context, 'curator.infoContent'),
          style: const TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 13,
            height: 1.5,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              appT(context, 'curator.close'),
              style: const TextStyle(color: Color(0xFF00E5FF)),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────

class _ScheduledProgram {
  final String id;
  final String title;
  final String description;
  final DateTime scheduledAt;
  final String channelName;
  final String status;

  _ScheduledProgram({
    required this.id,
    required this.title,
    required this.description,
    required this.scheduledAt,
    required this.channelName,
    required this.status,
  });
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _StatItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: const Color(0xFF00E5FF)),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 10,
              ),
            ),
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w700,
                fontFamily: 'Outfit',
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _SentimentStat extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _SentimentStat({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(height: 6),
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 11,
            fontWeight: FontWeight.w700,
            fontFamily: 'JetBrainsMono',
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 10,
          ),
        ),
      ],
    );
  }
}