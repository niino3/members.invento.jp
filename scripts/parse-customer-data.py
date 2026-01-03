#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
import csv

# 生データを文字列として定義
raw_data = """ア 株）ATENE LAB
イ 合同会社INIFINITY 川崎 智志
バ ヴァイター：石川貴之
ウ wind 池田晴
エ エメル 原口 建
エ エスイーテック 金明烈
オ 株)Office101 今井
オ 合同会社オリーブ：美島映子
キ kipuka：早川大
シ シェルドロップス：田村英規
ス ストーリープロデュース 神岡 仁美
テ TeamDylan 槇原
タ TAMUrepair 田村 昇平
ト ドラゴンマウス：萬谷美和子
ノ ノーブルスタイル：稲井まどか
ハ ハーバルサンタ：中村 元
フ 歩っとけあ 嘉陽
ブ Bluerose Services 得能事務所 ：得能一恵
フ ファンタスティックアート：浦桃代
ヘ ベリティ社会保険労務士事務局 豊嶋
ホ 保育安全のかたち：遠藤登
マ まさこば：小林 正知
ユ ユーラボ 上原継枝
レ Recona Music 小島 弘道
カ Carnival/PPエンタープライズ/すーめろりん/Par la magie 乾 曜子
ユ ユーズサッチ-谷川
イ 株)EVE ONE - 前田 悠斗
ア 合）ALLEMOR：松岡
ギ Gitobi：小野寺 類
コ コーズサッチ-谷川
エ エンジョイフットボール：下山悠
オ オフィスしのはら 篠原 康子
シ ShumMaKe 小池
チ チビクロカリブ 野間
ハ パドル 塩見 翼
ホ ボイドシステム 竹下
ラ wrapped
ロ ロックビレッジ：岩村勝男
テ TKXコーポレーション：中川
サ CircleDesign：那須
ス 3dims 小田実祈子
フ フロンディア：伊藤恵理子
レ レアウル：宇田津
マ マンガコネクト：栗原宏平
ミ ミサワホールディング：三沢
ム 合同会社睦月商会
ヨ 合同会社よしむ-吉村崇史
リ リバティ・プラント 三国武志
プ 株式会社Planeti 平田
オ officeT 山田健二郎
カ 上北沢貸自動車 鈴木 誠一
ク 株式会社クローバー
ク Gloria株式会社 孫 嘉豪
ス 株式会社スカイ
ト DorcusNAVI 柴崎 辰彦
ま まさこば：小林 正知
ウ ヴァイター：石川貴之
ノ 野口会計事務所
リ 株)Rikuka 古屋敷 幸枝
タ タビキャスト
プ プラザワンカンパニー 富田 義秀
ブ BLANKS 松木優
ス 鈴木造園 鈴木 一希
ト トラッシュアップ（不用品回収ダッシュ世田谷）：田宮 哲人
ハ HONEYEDGIFT： 木村佳保里
サ 有限会社サイムス 立川則人
エ （株）エヌ・インクリース：野口
メ メディアフォース 斎藤 哲哉
タ 高橋編集室
ソ SOLAR99：楠原孝尭
ケ ケイ・ミラクル：小谷明宏
ラ ライドザウェブ 長澤 圭一郎
ア Attic.503 神保朋子
キ きんば社会保険労務士事務所
サ 株）作図表現研究所
サ サステナブリッジ 森晶子
テ TEOTETERA：松本  前はT'YCHELYS
ス スタイルカンパニー 原口 舞
プ プログレス株式会社（遺品整理） 奥村 拓
カ Carnival/PPエンタープライズ/すーめろりん/Par la magie/スカイ乾 曜子
46 株式会社46MAG BY LOUISE
ハ 合同会社BURGERS-篠田洋輔
フ 富士光鉄筋興業：渡邊孝
ア 合）ALLEMOR：松岡"""

def parse_line(line):
    """1行を解析して、よみがな、会社名、氏名を抽出"""
    line = line.strip()
    if not line:
        return None

    # 最初の空白で分割
    parts = line.split(None, 1)
    if len(parts) < 2:
        return None

    kana = parts[0]
    rest = parts[1]

    # 会社名と氏名を分離
    # パターン1: "会社名：氏名" or "会社名 氏名" or "会社名-氏名"
    # パターン2: "会社名" のみ

    company_name = ""
    person_name = ""

    # コロン、ハイフンで分割を試みる
    if '：' in rest:
        parts = rest.split('：', 1)
        company_name = parts[0].strip()
        person_name = parts[1].strip() if len(parts) > 1 else ""
    elif '-' in rest and not rest.startswith('株'):
        # ハイフンがあり、株式会社の略記号でない場合
        parts = rest.split('-', 1)
        company_name = parts[0].strip()
        person_name = parts[1].strip() if len(parts) > 1 else ""
    else:
        # スペースで分割を試みる
        # 会社名の後に人名が来るパターンを検出
        # 一般的な会社形態の後のスペースを探す
        company_patterns = [
            r'^(.+?(?:株式会社|株\)|合同会社|合\)|有限会社|社会保険労務士事務所|編集室|事務所|会計事務所))\s+(.+)$',
            r'^([A-Za-z0-9\s\.\-/]+)\s+([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\s]+)$',  # 英数字会社名 日本語氏名
            r'^(.+?(?:株|式|社|組|会))\s+(.+)$',
        ]

        matched = False
        for pattern in company_patterns:
            match = re.match(pattern, rest)
            if match:
                company_name = match.group(1).strip()
                person_name = match.group(2).strip() if match.lastindex >= 2 else ""
                matched = True
                break

        if not matched:
            # マッチしない場合は全体を会社名として扱う
            company_name = rest.strip()
            person_name = ""

    return {
        'kana': kana,
        'company_name': company_name,
        'person_name': person_name
    }

# データを解析
customers = {}
for line in raw_data.split('\n'):
    result = parse_line(line)
    if result:
        # 会社名をキーにして重複を除く（最新のエントリを優先）
        company_key = result['company_name']
        if company_key and company_key not in customers:
            customers[company_key] = result

# CSVファイルに書き出し
output_file = 'customers.csv'
with open(output_file, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['よみがな', '会社名', '氏名'])

    # 会社名でソート
    for company_name in sorted(customers.keys()):
        customer = customers[company_name]
        writer.writerow([customer['kana'], customer['company_name'], customer['person_name']])

print(f'ユニークな顧客数: {len(customers)}')
print(f'CSVファイルを作成しました: {output_file}')
