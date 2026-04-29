// ============================================================
// ARGOS EventCalendar — Google Sheets Apps Script
// ============================================================

var SHEET_NAME = 'Sheet1';
var HEADERS = ['id', 'name', 'type', 'date_start', 'date_end', 'location', 'country', 'url', 'tags', 'relevance_score'];

// ---------- 1. 시트 초기 세팅 (최초 1회 실행) ----------

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // 헤더 입력
  var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setValues([HEADERS]);
  headerRange.setBackground('#1a1a2e');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(10);
  sheet.setFrozenRows(1);

  // 열 너비 설정
  var widths = [40, 300, 60, 100, 100, 200, 80, 250, 200, 60];
  for (var i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }

  // id 컬럼(A): 자동 채번 수식
  sheet.getRange('A2').setFormula('=ARRAYFORMULA(IF(B2:B<>"", ROW(B2:B)-1, ""))');

  // type 컬럼(C): 드롭다운 유효성 검사
  var typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['전시', '학회', '세미나'], true)
    .setAllowInvalid(false)
    .setHelpText('전시 / 학회 / 세미나 중 선택')
    .build();
  sheet.getRange('C2:C1000').setDataValidation(typeRule);

  // date_start(D), date_end(E): YYYY-MM-DD 텍스트 패턴 유효성
  var dateRule = SpreadsheetApp.newDataValidation()
    .requireTextMatchesPattern('^\\d{4}-\\d{2}-\\d{2}$')
    .setAllowInvalid(false)
    .setHelpText('YYYY-MM-DD 형식으로 입력 (예: 2026-01-15)')
    .build();
  sheet.getRange('D2:D1000').setDataValidation(dateRule);
  sheet.getRange('E2:E1000').setDataValidation(dateRule);

  // relevance_score(J): 1~5 숫자만 허용
  var scoreRule = SpreadsheetApp.newDataValidation()
    .requireNumberBetween(1, 5)
    .setAllowInvalid(false)
    .setHelpText('1~5 사이 정수 입력')
    .build();
  sheet.getRange('J2:J1000').setDataValidation(scoreRule);

  // 날짜 컬럼 서식을 일반 텍스트로 (자동 날짜 변환 방지)
  sheet.getRange('D2:E1000').setNumberFormat('@');

  SpreadsheetApp.getUi().alert('✅ ARGOS EventCalendar 시트 세팅 완료');
}

// ---------- 2. Slack 알림 트리거 ----------

function onEditTrigger(e) {
  if (!e || !e.range) return;

  var sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;

  var row = e.range.getRow();
  if (row < 2) return;

  var rowData = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];

  var name = rowData[1];       // B: name
  var type = rowData[2];       // C: type
  var dateStart = rowData[3];  // D: date_start
  var dateEnd = rowData[4];    // E: date_end
  var country = rowData[6];    // G: country
  var url = rowData[7];        // H: url

  // name + date_start 둘 다 있어야 발송
  if (!name || !dateStart) return;

  var webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
  if (!webhookUrl) {
    Logger.log('[ARGOS] SLACK_WEBHOOK_URL not configured — skipping notification');
    return;
  }

  var dateRange = dateStart;
  if (dateEnd && dateEnd !== dateStart) {
    dateRange += ' ~ ' + dateEnd;
  }

  var message = '*[ARGOS 이벤트 추가]* ' + name + '\n'
    + '📅 ' + dateRange + '\n'
    + '🏷 ' + (type || '-') + ' | 📍 ' + (country || '-') + '\n'
    + '🔗 ' + (url || '-');

  var payload = JSON.stringify({ text: message });

  try {
    UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: payload,
      muteHttpExceptions: true,
    });
  } catch (err) {
    Logger.log('[ARGOS] Slack notification failed: ' + err.message);
  }
}

// ---------- 3. 월별 정리 (수동 실행) ----------

function sortByDate() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return;

  // id 수식이 A2에 있으므로 B~J만 정렬 후 id는 자동 재계산됨
  var dataRange = sheet.getRange(2, 2, lastRow - 1, HEADERS.length - 1);
  dataRange.sort({ column: 4, ascending: true }); // column 4 = D = date_start

  SpreadsheetApp.getUi().alert('✅ date_start 기준 오름차순 정렬 완료');
}
