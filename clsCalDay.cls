VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "clsCalDay"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = True
'=== clsCalDay ===
'Classe pour stocker les informations d'une date dans le calendrier
Option Explicit

Public IsWeekend As Boolean
Public IsHoliday As Boolean
Public IsBusiness As Boolean
Public WeekStart As Long
Public ISOYear As Integer
Public ISOWeek As Integer

