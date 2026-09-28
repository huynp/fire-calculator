export type Lang = "en" | "vi";

export const LOCALES: Record<Lang, string> = { en: "en-US", vi: "vi-VN" };

export interface HelpSection {
  title: string;
  /** A paragraph, or [bold term, rest of the sentence]. */
  paragraphs: (string | [term: string, rest: string])[];
  bullets?: string[];
  note?: string;
}

interface Help {
  title: string;
  intro: string;
  sections: HelpSection[];
}

const enHelp: Help = {
  title: "How to use the FIRE Calculator",
  intro: "Estimate when your investments could cover your living costs, so work becomes optional.",
  sections: [
    {
      title: "1. Enter your numbers",
      paragraphs: [
        ["You:", " your age, the age you'd retire anyway, what you have invested today, and your currency."],
        ["Monthly budget:", " take-home income and spending. The difference is what gets invested each month."],
        [
          "Assumptions:",
          " expected yearly return (or pick a historical preset), inflation, and the withdrawal rate you'd live on. 4% is the common rule of thumb.",
        ],
      ],
    },
    {
      title: "2. Read the result",
      paragraphs: [
        [
          "Financial independence",
          " is the first year a withdrawal at your chosen rate covers your expenses, adjusted for inflation.",
        ],
        ["FIRE number", " is the portfolio you'd need today: yearly expenses ÷ withdrawal rate (25× at 4%)."],
        [
          "Income crossover",
          " is the earlier point where returns alone match expenses. It leaves less margin for bad markets.",
        ],
      ],
    },
    {
      title: "3. Explore the projection",
      paragraphs: [
        ["Portfolio", " shows your balance against the FIRE number; where they cross is your FI year."],
        ["Cash flow", " compares yearly investment returns with yearly expenses."],
        [
          "Today's money:",
          " amounts are shown in today's purchasing power, so they compare with prices now. Turn on Future values to see the inflated figures.",
        ],
        "Hover the chart for any year's figures, or download every year with CSV.",
      ],
    },
    {
      title: "4. Save or share",
      paragraphs: [
        "The page address always holds your numbers. Bookmark it, or use Share to copy the link and send it to someone.",
      ],
    },
    {
      title: "How the projection works",
      paragraphs: [],
      bullets: [
        "Returns are steady every year; real markets go up and down.",
        "Expenses grow with inflation. Taxes and fees aren't included.",
        'Once you reach your "stop investing" point you stop contributing for good and live off the portfolio.',
      ],
      note: "This is a planning estimate, not financial advice.",
    },
  ],
};

const viHelp: Help = {
  title: "Cách dùng máy tính FIRE",
  intro: "Ước tính khi nào khoản đầu tư đủ trang trải chi phí sinh hoạt, để đi làm trở thành một lựa chọn.",
  sections: [
    {
      title: "1. Nhập số liệu",
      paragraphs: [
        ["Bạn:", " tuổi hiện tại, tuổi bạn dự định nghỉ hưu, số tiền đang đầu tư và loại tiền tệ."],
        ["Ngân sách hằng tháng:", " thu nhập thực nhận và chi tiêu. Phần chênh lệch là số tiền đầu tư mỗi tháng."],
        [
          "Giả định:",
          " lợi nhuận kỳ vọng mỗi năm (hoặc chọn một mức theo lịch sử), lạm phát và tỷ lệ rút bạn sẽ sống dựa vào. 4% là quy tắc phổ biến.",
        ],
      ],
    },
    {
      title: "2. Đọc kết quả",
      paragraphs: [
        [
          "Độc lập tài chính",
          " là năm đầu tiên khoản rút theo tỷ lệ bạn chọn đủ trang trải chi tiêu, đã tính lạm phát.",
        ],
        ["Số tiền FIRE", " là danh mục bạn cần ngay hôm nay: chi tiêu một năm ÷ tỷ lệ rút (25 lần với 4%)."],
        [
          "Điểm giao thu nhập",
          " là mốc sớm hơn, khi riêng lợi nhuận đã bằng chi tiêu. Mốc này ít dư địa hơn khi thị trường xấu.",
        ],
      ],
    },
    {
      title: "3. Xem dự phóng",
      paragraphs: [
        ["Danh mục", " cho thấy số dư so với số tiền FIRE; nơi hai đường gặp nhau là năm bạn đạt FI."],
        ["Dòng tiền", " so sánh lợi nhuận đầu tư hằng năm với chi tiêu hằng năm."],
        [
          "Giá trị hôm nay:",
          " số tiền được quy về sức mua hiện tại để dễ so sánh với giá cả bây giờ. Bật Giá trị tương lai để xem số đã cộng lạm phát.",
        ],
        "Di chuột lên biểu đồ để xem số liệu từng năm, hoặc tải toàn bộ bằng CSV.",
      ],
    },
    {
      title: "4. Lưu hoặc chia sẻ",
      paragraphs: [
        "Địa chỉ trang luôn chứa số liệu của bạn. Hãy lưu dấu trang, hoặc bấm Chia sẻ để sao chép liên kết và gửi cho người khác.",
      ],
    },
    {
      title: "Cách dự phóng hoạt động",
      paragraphs: [],
      bullets: [
        "Lợi nhuận được giả định đều đặn mỗi năm; thị trường thực tế lên xuống.",
        "Chi tiêu tăng theo lạm phát. Chưa tính thuế và phí.",
        "Khi đạt mốc “ngừng đầu tư”, bạn ngừng đóng góp hẳn và sống dựa vào danh mục.",
      ],
      note: "Đây là ước tính để lập kế hoạch, không phải lời khuyên tài chính.",
    },
  ],
};

const en = {
  appName: "FIRE Calculator",
  language: "Language",
  share: "Share",
  logIn: "Log in",
  helpButton: "How to use this calculator",
  linkCopied: "Link copied. It opens this plan with your numbers.",
  copyFailed: "Couldn't copy. Copy the link from the address bar instead.",

  you: "You",
  currentAge: "Current age",
  retirementAge: "Retirement age",
  currentInvestments: "Current investments",
  currency: "Currency",
  monthlyBudget: "Monthly budget",
  income: "Income",
  expenses: "Expenses",
  investedMonthly: "Invested each month",

  assumptions: "Assumptions",
  savedScenario: "Saved scenario",
  selectScenario: "Select a scenario",
  deleteScenario: "Delete scenario",
  expectedReturn: "Expected annual return",
  returnPresets: "Historical return presets",
  presetNames: { bonds: "Bonds", balanced: "60/40", stocks: "All stocks" },
  presetsSource:
    "Approximate US averages since 1926 (Vanguard). All stocks ≈ an S&P 500 fund like VOO. Past returns don't guarantee future ones.",
  inflation: "Inflation",
  withdrawalRate: "Withdrawal rate",
  stopInvestingWhen: "Stop investing when",
  stopSafe: (swr: number) => `A ${swr}% withdrawal covers expenses`,
  stopCrossover: (r: number) => `Returns (${r}%) cover expenses`,
  stopSafeHint: "Conservative: the safe-withdrawal rule.",
  stopCrossoverHint: "Aggressive: less margin for bad markets.",
  scenarioName: "Scenario name",
  defaultScenarioName: "My FIRE Plan",
  saveScenario: "Save scenario",

  financialIndependence: "Financial independence",
  atAge: (age: number) => `at age ${age}`,
  reasonSafe: (swr: number) => `a ${swr}% withdrawal covers your inflation-adjusted expenses`,
  reasonCrossover: (r: number) => `investment returns (${r}%) cover your inflation-adjusted expenses`,
  alreadyThere: (reason: string) => `Already there: ${reason} today.`,
  inYears: (n: number, reason: string) => `In ${n} ${n === 1 ? "year" : "years"}, when ${reason}.`,
  notWithin50: "Not within 50 years",
  notWithin50Hint: "Invest more each month, lower expenses, or revisit the return assumption.",
  fireNumberToday: "FIRE number today",
  timesExpenses: (x: number) => `${x}× annual expenses`,
  portfolioAtFi: "Portfolio at FI",
  inYear: (year: number, todaysMoney: boolean) => (todaysMoney ? `in ${year}, today's money` : `in ${year}`),
  savingsRate: "Savings rate",
  perMonth: (amount: string) => `${amount} a month`,
  ruleReached: (swr: number) => `${swr}% rule reached`,
  incomeCrossover: "Income crossover",
  ageOnly: (age: number) => `age ${age}`,
  notAfterStopping: "not after you stop investing",

  projection: "Projection",
  portfolioSubtitle: "Portfolio balance against the amount you need.",
  cashflowSubtitle: "Investment returns against yearly expenses.",
  inTodaysMoney: "In today's money.",
  inFutureValues: "In future values.",
  portfolio: "Portfolio",
  cashFlow: "Cash flow",
  exportCsv: "Export projection as CSV",
  portfolioBalance: "Portfolio balance",
  fireNumber: "FIRE number",
  investmentReturns: "Investment returns",
  futureValues: "Future values",
  fiMarker: (year: number) => `FI ${year}`,
  crossoverMarker: (year: number) => `Crossover ${year}`,
  yearAge: (year: number, age: number) => `${year} · age ${age}`,
  footnote: "After you reach FI, contributions stop and yearly expenses come out of the portfolio.",

  csvExported: "Projection exported to CSV",
  loadedScenario: (name: string) => `Loaded scenario: ${name}`,
  savedScenarioOk: "Scenario saved",
  deletedScenarioOk: "Scenario deleted",
  saveFailed: (message: string) => `Couldn't save: ${message}`,
  deleteFailed: (message: string) => `Couldn't delete: ${message}`,
  loginToSave: "Log in to save scenarios",
  confirmDelete: "Delete this scenario?",

  csv: {
    title: "FIRE Calculator export",
    budget: "Budget",
    monthlyIncome: "Monthly income",
    monthlyExpenses: "Monthly expenses",
    monthlyInvested: "Invested each month",
    assumptions: "Assumptions",
    currency: "Currency",
    currentInvestments: "Current investments",
    annualReturn: "Annual return (%)",
    currentAge: "Current age",
    retirementAge: "Retirement age",
    inflation: "Inflation (%)",
    withdrawalRate: "Withdrawal rate (%)",
    stopInvesting: "Stop investing when",
    stopSafe: "Withdrawal rule",
    stopCrossover: "Income crossover",
    columns: [
      "Year",
      "Age",
      "Portfolio balance",
      "Contribution",
      "Expenses",
      "Investment returns",
      "Safe withdrawal",
      "FIRE number",
      "Income crossover",
      "Withdrawal rule reached",
    ],
    yes: "Yes",
    no: "No",
  },

  help: enHelp,
};

export type Messages = typeof en;

const vi: Messages = {
  appName: "Máy tính FIRE",
  language: "Ngôn ngữ",
  share: "Chia sẻ",
  logIn: "Đăng nhập",
  helpButton: "Cách dùng máy tính này",
  linkCopied: "Đã sao chép liên kết. Liên kết sẽ mở lại kế hoạch với số liệu của bạn.",
  copyFailed: "Không sao chép được. Hãy sao chép liên kết trên thanh địa chỉ.",

  you: "Bạn",
  currentAge: "Tuổi hiện tại",
  retirementAge: "Tuổi nghỉ hưu",
  currentInvestments: "Tài sản đầu tư hiện có",
  currency: "Tiền tệ",
  monthlyBudget: "Ngân sách hằng tháng",
  income: "Thu nhập",
  expenses: "Chi tiêu",
  investedMonthly: "Đầu tư mỗi tháng",

  assumptions: "Giả định",
  savedScenario: "Kịch bản đã lưu",
  selectScenario: "Chọn kịch bản",
  deleteScenario: "Xóa kịch bản",
  expectedReturn: "Lợi nhuận kỳ vọng mỗi năm",
  returnPresets: "Mức lợi nhuận theo lịch sử",
  presetNames: { bonds: "Trái phiếu", balanced: "60/40", stocks: "Toàn cổ phiếu" },
  presetsSource:
    "Mức trung bình gần đúng tại Mỹ từ năm 1926 (Vanguard). Toàn cổ phiếu ≈ một quỹ S&P 500 như VOO. Lợi nhuận quá khứ không đảm bảo cho tương lai.",
  inflation: "Lạm phát",
  withdrawalRate: "Tỷ lệ rút",
  stopInvestingWhen: "Ngừng đầu tư khi",
  stopSafe: (swr) => `Rút ${swr}% mỗi năm đủ chi tiêu`,
  stopCrossover: (r) => `Lợi nhuận (${r}%) đủ chi tiêu`,
  stopSafeHint: "Thận trọng: theo quy tắc rút an toàn.",
  stopCrossoverHint: "Mạo hiểm: ít dư địa khi thị trường xấu.",
  scenarioName: "Tên kịch bản",
  defaultScenarioName: "Kế hoạch FIRE của tôi",
  saveScenario: "Lưu kịch bản",

  financialIndependence: "Độc lập tài chính",
  atAge: (age) => `ở tuổi ${age}`,
  reasonSafe: (swr) => `rút ${swr}% mỗi năm đủ trang trải chi tiêu (đã tính lạm phát)`,
  reasonCrossover: (r) => `lợi nhuận đầu tư (${r}%) đủ trang trải chi tiêu (đã tính lạm phát)`,
  alreadyThere: (reason) => `Bạn đã đạt: ${reason} ngay từ hôm nay.`,
  inYears: (n, reason) => `Sau ${n} năm nữa, khi ${reason}.`,
  notWithin50: "Chưa đạt trong 50 năm",
  notWithin50Hint: "Hãy đầu tư nhiều hơn mỗi tháng, giảm chi tiêu hoặc xem lại giả định lợi nhuận.",
  fireNumberToday: "Số tiền FIRE hiện nay",
  timesExpenses: (x) => `${x} lần chi tiêu một năm`,
  portfolioAtFi: "Danh mục khi đạt FI",
  inYear: (year, todaysMoney) => (todaysMoney ? `năm ${year}, theo giá trị hôm nay` : `năm ${year}`),
  savingsRate: "Tỷ lệ tiết kiệm",
  perMonth: (amount) => `${amount} mỗi tháng`,
  ruleReached: (swr) => `Đạt quy tắc ${swr}%`,
  incomeCrossover: "Điểm giao thu nhập",
  ageOnly: (age) => `${age} tuổi`,
  notAfterStopping: "không đạt sau khi ngừng đầu tư",

  projection: "Dự phóng",
  portfolioSubtitle: "Số dư danh mục so với số tiền bạn cần.",
  cashflowSubtitle: "Lợi nhuận đầu tư so với chi tiêu hằng năm.",
  inTodaysMoney: "Theo giá trị hôm nay.",
  inFutureValues: "Theo giá trị tương lai.",
  portfolio: "Danh mục",
  cashFlow: "Dòng tiền",
  exportCsv: "Xuất dự phóng ra CSV",
  portfolioBalance: "Số dư danh mục",
  fireNumber: "Số tiền FIRE",
  investmentReturns: "Lợi nhuận đầu tư",
  futureValues: "Giá trị tương lai",
  fiMarker: (year) => `FI ${year}`,
  crossoverMarker: (year) => `Điểm giao ${year}`,
  yearAge: (year, age) => `${year} · ${age} tuổi`,
  footnote: "Sau khi đạt FI, bạn ngừng đóng góp và chi tiêu hằng năm được rút từ danh mục.",

  csvExported: "Đã xuất dự phóng ra CSV",
  loadedScenario: (name) => `Đã mở kịch bản: ${name}`,
  savedScenarioOk: "Đã lưu kịch bản",
  deletedScenarioOk: "Đã xóa kịch bản",
  saveFailed: (message) => `Không lưu được: ${message}`,
  deleteFailed: (message) => `Không xóa được: ${message}`,
  loginToSave: "Đăng nhập để lưu kịch bản",
  confirmDelete: "Xóa kịch bản này?",

  csv: {
    title: "Dữ liệu xuất từ Máy tính FIRE",
    budget: "Ngân sách",
    monthlyIncome: "Thu nhập hằng tháng",
    monthlyExpenses: "Chi tiêu hằng tháng",
    monthlyInvested: "Đầu tư mỗi tháng",
    assumptions: "Giả định",
    currency: "Tiền tệ",
    currentInvestments: "Tài sản đầu tư hiện có",
    annualReturn: "Lợi nhuận mỗi năm (%)",
    currentAge: "Tuổi hiện tại",
    retirementAge: "Tuổi nghỉ hưu",
    inflation: "Lạm phát (%)",
    withdrawalRate: "Tỷ lệ rút (%)",
    stopInvesting: "Ngừng đầu tư khi",
    stopSafe: "Quy tắc rút",
    stopCrossover: "Điểm giao thu nhập",
    columns: [
      "Năm",
      "Tuổi",
      "Số dư danh mục",
      "Đóng góp",
      "Chi tiêu",
      "Lợi nhuận đầu tư",
      "Rút an toàn",
      "Số tiền FIRE",
      "Điểm giao thu nhập",
      "Đạt quy tắc rút",
    ],
    yes: "Có",
    no: "Không",
  },

  help: viHelp,
};

export const MESSAGES: Record<Lang, Messages> = { en, vi };
