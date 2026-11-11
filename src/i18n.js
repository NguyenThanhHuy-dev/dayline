// DOM-free: usable from node tests. Flat keys, `{name}` interpolation.
const vi = {
  'doc.title': 'dayline - thời gian biểu',
  'btn.undo': 'Hoàn tác',
  'btn.redo': 'Làm lại',
  'btn.revert': 'Về bản gốc',
  'btn.copyPrompt': 'Copy prompt mẫu',
  'btn.share': 'Copy link chia sẻ',
  'btn.png': 'Xuất PNG',
  'btn.file': 'Tải file .txt',
  'btn.delete': 'Xóa',
  'btn.deselect': 'Bỏ chọn',
  'flash.copied': 'Đã copy!',
  'flash.linkCopied': 'Đã copy link!',
  'pane.edit': 'Soạn thảo',
  'pane.view': 'Thời gian biểu',
  'editor.placeholder': 'Dán thời gian biểu vào đây…',
  'toolbar.zoom': 'Zoom',
  'toolbar.full': 'Hiện đủ 24h',
  'lang.switch': 'Ngôn ngữ',
  'timeline.empty': 'Chưa có dữ liệu.',
  'timeline.deleteBlock': 'Xóa khối này',
  'group.untitled': 'Không tên',
  'group.default': 'Mặc định',
  'type.personal': 'cá nhân',
  'type.commute': 'di chuyển',
  'type.work': 'công việc',
  'type.meal': 'ăn uống',
  'type.study': 'học tập',
  'type.exercise': 'thể thao',
  'type.chores': 'việc nhà',
  'type.relax': 'thư giãn',
  'type.sleep': 'ngủ',
  'issue.fields': 'Dòng {line}: thiếu trường (cần: giờ | loại | tiêu đề)',
  'issue.rangeFormat': 'Dòng {line}: khung giờ phải có dạng HH:MM-HH:MM',
  'issue.badStart': 'Dòng {line}: giờ bắt đầu không hợp lệ: "{value}"',
  'issue.badEnd': 'Dòng {line}: giờ kết thúc không hợp lệ: "{value}"',
  'issue.endBeforeStart': 'Dòng {line}: giờ kết thúc nhỏ hơn giờ bắt đầu',
  'issue.endEqualsStart': 'Dòng {line}: giờ kết thúc bằng giờ bắt đầu',
  'issue.noTitle': 'Dòng {line}: thiếu tiêu đề',
  'issue.unknownType': 'Dòng {line}: loại lạ "{type}", tô màu xám',
  'issue.overlap': 'Dòng {line}: chồng giờ với dòng {with} ({group})',
  'issue.gap': 'Dòng {line}: hở {minutes} phút sau dòng {after} ({group})',
  prompt: `Bạn là trợ lý lập thời gian biểu. Hãy viết hoặc sửa thời gian biểu của tôi theo ĐÚNG định dạng text dưới đây.

ĐỊNH DẠNG
- Mỗi nhóm ngày bắt đầu bằng một dòng: # Tên nhóm ngày (ví dụ: # Thứ 2-6, # Thứ 7, # Chủ nhật)
- Mỗi hoạt động một dòng: HH:MM-HH:MM | loại | Tiêu đề | ghi chú (tùy chọn) | ghi chú 2 (tùy chọn)
- Giờ dạng 24 giờ, ví dụ 06:30 hoặc 22:45. Giờ kết thúc phải lớn hơn giờ bắt đầu; dùng 24:00 cho nửa đêm.
- loại chỉ được là một trong: {types}
- Các khung giờ liên tiếp, không chồng nhau, không để hở.

VÍ DỤ
# Thứ 2-6
06:45-07:45 | personal | Dậy, giãn cơ, vệ sinh cá nhân | Giãn cơ 10 phút
07:45-08:30 | commute | Đi làm
08:30-12:00 | work | Làm việc
12:00-13:00 | meal | Ăn trưa
13:00-17:30 | work | Làm việc | Bữa phụ lúc 15:30
17:30-18:30 | commute | Đi về
18:30-19:30 | meal | Ăn tối
19:30-22:45 | relax | Thư giãn
22:45-24:00 | sleep | Ngủ

# Thứ 7
08:00-09:00 | personal | Dậy, vệ sinh cá nhân
09:00-12:00 | exercise | Chạy bộ, tập gym

YÊU CẦU
Chỉ trả về nội dung theo đúng định dạng trên, trong một khối mã (code block). Không giải thích, không thêm lời nói đầu hay kết luận.

ROUTINE CỦA TÔI (dán hoặc mô tả bên dưới, kèm yêu cầu chỉnh sửa nếu có):
<<< DÁN ROUTINE CỦA BẠN Ở ĐÂY >>>
`,
};

const en = {
  'doc.title': 'dayline - daily schedule',
  'btn.undo': 'Undo',
  'btn.redo': 'Redo',
  'btn.revert': 'Revert to original',
  'btn.copyPrompt': 'Copy prompt template',
  'btn.share': 'Copy share link',
  'btn.png': 'Export PNG',
  'btn.file': 'Load .txt file',
  'btn.delete': 'Delete',
  'btn.deselect': 'Deselect',
  'flash.copied': 'Copied!',
  'flash.linkCopied': 'Link copied!',
  'pane.edit': 'Edit',
  'pane.view': 'Timeline',
  'editor.placeholder': 'Paste your schedule here…',
  'toolbar.zoom': 'Zoom',
  'toolbar.full': 'Show full 24h',
  'lang.switch': 'Language',
  'timeline.empty': 'No data yet.',
  'timeline.deleteBlock': 'Delete this block',
  'group.untitled': 'Untitled',
  'group.default': 'Default',
  'type.personal': 'personal',
  'type.commute': 'commute',
  'type.work': 'work',
  'type.meal': 'meals',
  'type.study': 'study',
  'type.exercise': 'exercise',
  'type.chores': 'chores',
  'type.relax': 'relax',
  'type.sleep': 'sleep',
  'issue.fields': 'Line {line}: missing fields (need: time | type | title)',
  'issue.rangeFormat': 'Line {line}: time range must look like HH:MM-HH:MM',
  'issue.badStart': 'Line {line}: invalid start time: "{value}"',
  'issue.badEnd': 'Line {line}: invalid end time: "{value}"',
  'issue.endBeforeStart': 'Line {line}: end time is earlier than start time',
  'issue.endEqualsStart': 'Line {line}: end time equals start time',
  'issue.noTitle': 'Line {line}: missing title',
  'issue.unknownType': 'Line {line}: unknown type "{type}", shown in gray',
  'issue.overlap': 'Line {line}: overlaps line {with} ({group})',
  'issue.gap': 'Line {line}: {minutes} min gap after line {after} ({group})',
  prompt: `You are a daily-schedule assistant. Write or edit my schedule in EXACTLY the plain-text format below.

FORMAT
- Each day group starts with one line: # Group name (for example: # Mon-Fri, # Saturday, # Sunday)
- One activity per line: HH:MM-HH:MM | type | Title | note (optional) | note 2 (optional)
- Use 24-hour time, for example 06:30 or 22:45. The end time must be later than the start time; use 24:00 for midnight.
- type must be one of: {types}
- Time ranges are consecutive, with no overlaps and no gaps.

EXAMPLE
# Mon-Fri
06:45-07:45 | personal | Wake up, stretch, get ready | Stretch for 10 minutes
07:45-08:30 | commute | Commute to work
08:30-12:00 | work | Work
12:00-13:00 | meal | Lunch
13:00-17:30 | work | Work | Snack at 15:30
17:30-18:30 | commute | Commute home
18:30-19:30 | meal | Dinner
19:30-22:45 | relax | Relax
22:45-24:00 | sleep | Sleep

# Saturday
08:00-09:00 | personal | Wake up, get ready
09:00-12:00 | exercise | Run, gym

REQUIREMENTS
Return only the content in the exact format above, inside one code block. No explanations, no introduction or conclusion.

MY ROUTINE (paste or describe it below, with any edit requests):
<<< PASTE YOUR ROUTINE HERE >>>
`,
};

export const DICT = { vi, en };
export const LANGS = Object.keys(DICT);
const KEY = 'dayline:lang';

function detect() {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  if (LANGS.includes(saved)) return saved;
  const nav = typeof navigator !== 'undefined' ? navigator.language ?? '' : '';
  return nav.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

let lang = detect();

export const getLang = () => lang;

export function setLang(next) {
  if (!LANGS.includes(next)) return lang;
  lang = next;
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, next);
  return lang;
}

// translator bound to a fixed language; missing key falls back to vi, then to the key itself
export const translator = (l) => (key, params = {}) =>
  (DICT[l]?.[key] ?? DICT.vi[key] ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m));

export const t = (key, params) => translator(lang)(key, params);
