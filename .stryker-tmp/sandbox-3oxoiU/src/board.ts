// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { Game } from './Game';
export function countNeighbours(game: Game, x: number, y: number): number {
  if (stryMutAct_9fa48("0")) {
    {}
  } else {
    stryCov_9fa48("0");
    let count = 0;
    let startY = y;
    let startX = x;
    let limitY = y;
    let limitX = x;
    if (stryMutAct_9fa48("4") ? x <= 0 : stryMutAct_9fa48("3") ? x >= 0 : stryMutAct_9fa48("2") ? false : stryMutAct_9fa48("1") ? true : (stryCov_9fa48("1", "2", "3", "4"), x > 0)) {
      if (stryMutAct_9fa48("5")) {
        {}
      } else {
        stryCov_9fa48("5");
        startX = stryMutAct_9fa48("6") ? x + 1 : (stryCov_9fa48("6"), x - 1);
      }
    }
    if (stryMutAct_9fa48("10") ? x + 1 >= game.boardWidth : stryMutAct_9fa48("9") ? x + 1 <= game.boardWidth : stryMutAct_9fa48("8") ? false : stryMutAct_9fa48("7") ? true : (stryCov_9fa48("7", "8", "9", "10"), (stryMutAct_9fa48("11") ? x - 1 : (stryCov_9fa48("11"), x + 1)) < game.boardWidth)) {
      if (stryMutAct_9fa48("12")) {
        {}
      } else {
        stryCov_9fa48("12");
        limitX = stryMutAct_9fa48("13") ? x - 1 : (stryCov_9fa48("13"), x + 1);
      }
    }
    if (stryMutAct_9fa48("17") ? y <= 0 : stryMutAct_9fa48("16") ? y >= 0 : stryMutAct_9fa48("15") ? false : stryMutAct_9fa48("14") ? true : (stryCov_9fa48("14", "15", "16", "17"), y > 0)) {
      if (stryMutAct_9fa48("18")) {
        {}
      } else {
        stryCov_9fa48("18");
        startY = stryMutAct_9fa48("19") ? y + 1 : (stryCov_9fa48("19"), y - 1);
      }
    }
    if (stryMutAct_9fa48("23") ? y + 1 >= game.boardHeight : stryMutAct_9fa48("22") ? y + 1 <= game.boardHeight : stryMutAct_9fa48("21") ? false : stryMutAct_9fa48("20") ? true : (stryCov_9fa48("20", "21", "22", "23"), (stryMutAct_9fa48("24") ? y - 1 : (stryCov_9fa48("24"), y + 1)) < game.boardHeight)) {
      if (stryMutAct_9fa48("25")) {
        {}
      } else {
        stryCov_9fa48("25");
        limitY = stryMutAct_9fa48("26") ? y - 1 : (stryCov_9fa48("26"), y + 1);
      }
    }
    for (let rowIndex = startY; stryMutAct_9fa48("29") ? rowIndex > limitY : stryMutAct_9fa48("28") ? rowIndex < limitY : stryMutAct_9fa48("27") ? false : (stryCov_9fa48("27", "28", "29"), rowIndex <= limitY); stryMutAct_9fa48("30") ? rowIndex-- : (stryCov_9fa48("30"), rowIndex++)) {
      if (stryMutAct_9fa48("31")) {
        {}
      } else {
        stryCov_9fa48("31");
        for (let columnIndex = startX; stryMutAct_9fa48("34") ? columnIndex > limitX : stryMutAct_9fa48("33") ? columnIndex < limitX : stryMutAct_9fa48("32") ? false : (stryCov_9fa48("32", "33", "34"), columnIndex <= limitX); stryMutAct_9fa48("35") ? columnIndex-- : (stryCov_9fa48("35"), columnIndex++)) {
          if (stryMutAct_9fa48("36")) {
            {}
          } else {
            stryCov_9fa48("36");
            if (stryMutAct_9fa48("39") ? game.board[rowIndex][columnIndex] !== -1 : stryMutAct_9fa48("38") ? false : stryMutAct_9fa48("37") ? true : (stryCov_9fa48("37", "38", "39"), game.board[rowIndex][columnIndex] === (stryMutAct_9fa48("40") ? +1 : (stryCov_9fa48("40"), -1)))) {
              if (stryMutAct_9fa48("41")) {
                {}
              } else {
                stryCov_9fa48("41");
                stryMutAct_9fa48("42") ? count-- : (stryCov_9fa48("42"), count++);
              }
            }
          }
        }
      }
    }
    return count;
  }
}
export function expandPop(x: number, y: number, game: Game): number[][] {
  if (stryMutAct_9fa48("43")) {
    {}
  } else {
    stryCov_9fa48("43");
    const cells: number[][] = stryMutAct_9fa48("44") ? ["Stryker was here"] : (stryCov_9fa48("44"), []);
    function expandCell(cellX: number, cellY: number): void {
      if (stryMutAct_9fa48("45")) {
        {}
      } else {
        stryCov_9fa48("45");
        game.popped[cellY][cellX] = stryMutAct_9fa48("46") ? false : (stryCov_9fa48("46"), true);
        cells.push(stryMutAct_9fa48("48") ? [] : (stryCov_9fa48("48"), [stryMutAct_9fa48("49") ? cellX - 1 : (stryCov_9fa48("49"), cellX + 1), stryMutAct_9fa48("50") ? cellY - 1 : (stryCov_9fa48("50"), cellY + 1), game.board[cellY][cellX]]));
        let startY = cellY;
        let startX = cellX;
        let limitY = cellY;
        let limitX = cellX;
        if (stryMutAct_9fa48("54") ? cellX <= 0 : stryMutAct_9fa48("53") ? cellX >= 0 : stryMutAct_9fa48("52") ? false : stryMutAct_9fa48("51") ? true : (stryCov_9fa48("51", "52", "53", "54"), cellX > 0)) {
          if (stryMutAct_9fa48("55")) {
            {}
          } else {
            stryCov_9fa48("55");
            startX = stryMutAct_9fa48("56") ? cellX + 1 : (stryCov_9fa48("56"), cellX - 1);
          }
        }
        if (stryMutAct_9fa48("60") ? cellX + 1 >= game.boardWidth : stryMutAct_9fa48("59") ? cellX + 1 <= game.boardWidth : stryMutAct_9fa48("58") ? false : stryMutAct_9fa48("57") ? true : (stryCov_9fa48("57", "58", "59", "60"), (stryMutAct_9fa48("61") ? cellX - 1 : (stryCov_9fa48("61"), cellX + 1)) < game.boardWidth)) {
          if (stryMutAct_9fa48("62")) {
            {}
          } else {
            stryCov_9fa48("62");
            limitX = stryMutAct_9fa48("63") ? cellX - 1 : (stryCov_9fa48("63"), cellX + 1);
          }
        }
        if (stryMutAct_9fa48("67") ? cellY <= 0 : stryMutAct_9fa48("66") ? cellY >= 0 : stryMutAct_9fa48("65") ? false : stryMutAct_9fa48("64") ? true : (stryCov_9fa48("64", "65", "66", "67"), cellY > 0)) {
          if (stryMutAct_9fa48("68")) {
            {}
          } else {
            stryCov_9fa48("68");
            startY = stryMutAct_9fa48("69") ? cellY + 1 : (stryCov_9fa48("69"), cellY - 1);
          }
        }
        if (stryMutAct_9fa48("73") ? cellY + 1 >= game.boardHeight : stryMutAct_9fa48("72") ? cellY + 1 <= game.boardHeight : stryMutAct_9fa48("71") ? false : stryMutAct_9fa48("70") ? true : (stryCov_9fa48("70", "71", "72", "73"), (stryMutAct_9fa48("74") ? cellY - 1 : (stryCov_9fa48("74"), cellY + 1)) < game.boardHeight)) {
          if (stryMutAct_9fa48("75")) {
            {}
          } else {
            stryCov_9fa48("75");
            limitY = stryMutAct_9fa48("76") ? cellY - 1 : (stryCov_9fa48("76"), cellY + 1);
          }
        }
        if (stryMutAct_9fa48("79") ? game.board[cellY][cellX] !== 0 : stryMutAct_9fa48("78") ? false : stryMutAct_9fa48("77") ? true : (stryCov_9fa48("77", "78", "79"), game.board[cellY][cellX] === 0)) {
          if (stryMutAct_9fa48("80")) {
            {}
          } else {
            stryCov_9fa48("80");
            for (let rowIndex = startY; stryMutAct_9fa48("83") ? rowIndex > limitY : stryMutAct_9fa48("82") ? rowIndex < limitY : stryMutAct_9fa48("81") ? false : (stryCov_9fa48("81", "82", "83"), rowIndex <= limitY); stryMutAct_9fa48("84") ? rowIndex-- : (stryCov_9fa48("84"), rowIndex++)) {
              if (stryMutAct_9fa48("85")) {
                {}
              } else {
                stryCov_9fa48("85");
                for (let columnIndex = startX; stryMutAct_9fa48("88") ? columnIndex > limitX : stryMutAct_9fa48("87") ? columnIndex < limitX : stryMutAct_9fa48("86") ? false : (stryCov_9fa48("86", "87", "88"), columnIndex <= limitX); stryMutAct_9fa48("89") ? columnIndex-- : (stryCov_9fa48("89"), columnIndex++)) {
                  if (stryMutAct_9fa48("90")) {
                    {}
                  } else {
                    stryCov_9fa48("90");
                    if (stryMutAct_9fa48("93") ? false : stryMutAct_9fa48("92") ? true : stryMutAct_9fa48("91") ? game.popped[rowIndex][columnIndex] : (stryCov_9fa48("91", "92", "93"), !game.popped[rowIndex][columnIndex])) {
                      if (stryMutAct_9fa48("94")) {
                        {}
                      } else {
                        stryCov_9fa48("94");
                        if (stryMutAct_9fa48("95")) {
                          ;
                        } else {
                          stryCov_9fa48("95");
                          expandCell(columnIndex, rowIndex);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    if (stryMutAct_9fa48("96")) {
      ;
    } else {
      stryCov_9fa48("96");
      expandCell(x, y);
    }
    return cells;
  }
}