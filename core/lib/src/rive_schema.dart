enum RiveFieldType { uint, string, float32, color, bool, bytes, callback }

class RivePropertyDefinition {
  const RivePropertyDefinition(this.name, this.type);

  final String name;
  final RiveFieldType type;
}

class RiveCoreType {
  const RiveCoreType(this.key, this.name);

  final int key;
  final String name;
}

// Vendored from rive 0.13.20 generated core definitions. This is deliberately
// a metadata subset, not a complete or authoritative Rive runtime schema.
abstract final class RiveSchema {
  static const int supportedMajorVersion = 7;

  static const int artboardTypeKey = 1;
  static const int componentTypeKey = 10;
  static const int linearAnimationTypeKey = 31;
  static const int stateMachineTypeKey = 53;
  static const int stateMachineNumberTypeKey = 56;
  static const int stateMachineTriggerTypeKey = 58;
  static const int stateMachineBoolTypeKey = 59;
  static const int fileAssetContentsTypeKey = 106;
  static const int viewModelInstanceColorTypeKey = 426;
  static const int viewModelInstanceValueTypeKey = 428;
  static const int viewModelPropertyNumberTypeKey = 431;
  static const int viewModelInstanceEnumTypeKey = 432;
  static const int viewModelInstanceStringTypeKey = 433;
  static const int viewModelPropertyListTypeKey = 434;
  static const int viewModelTypeKey = 435;
  static const int viewModelPropertyViewModelTypeKey = 436;
  static const int viewModelInstanceTypeKey = 437;
  static const int dataEnumTypeKey = 438;
  static const int viewModelPropertyEnumTypeKey = 439;
  static const int viewModelPropertyColorTypeKey = 440;
  static const int viewModelInstanceListTypeKey = 441;
  static const int viewModelInstanceNumberTypeKey = 442;
  static const int viewModelPropertyStringTypeKey = 443;
  static const int viewModelInstanceViewModelTypeKey = 444;
  static const int dataEnumValueTypeKey = 445;
  static const int viewModelPropertyBooleanTypeKey = 448;
  static const int viewModelInstanceBooleanTypeKey = 449;

  static const int componentNamePropertyKey = 4;
  static const int componentParentIdPropertyKey = 5;
  static const int artboardDefaultStateMachineIdPropertyKey = 236;
  static const int artboardViewModelIdPropertyKey = 583;
  static const int animationNamePropertyKey = 55;
  static const int animationFpsPropertyKey = 56;
  static const int animationDurationPropertyKey = 57;
  static const int animationSpeedPropertyKey = 58;
  static const int animationLoopPropertyKey = 59;
  static const int stateMachineComponentNamePropertyKey = 138;
  static const int stateMachineNumberValuePropertyKey = 140;
  static const int stateMachineBoolValuePropertyKey = 141;
  static const int fileAssetContentsBytesPropertyKey = 212;
  static const int fileAssetContentsUnknown911PropertyKey = 911;
  static const int viewModelInstanceValuePropertyIdPropertyKey = 554;
  static const int viewModelInstanceColorValuePropertyKey = 555;
  static const int viewModelComponentNamePropertyKey = 557;
  static const int viewModelInstanceEnumValuePropertyKey = 560;
  static const int viewModelInstanceStringValuePropertyKey = 561;
  static const int viewModelDefaultInstanceIdPropertyKey = 564;
  static const int viewModelPropertyViewModelReferenceIdPropertyKey = 565;
  static const int viewModelInstanceViewModelIdPropertyKey = 566;
  static const int viewModelPropertyEnumIdPropertyKey = 574;
  static const int viewModelInstanceNumberValuePropertyKey = 575;
  static const int viewModelInstanceViewModelValuePropertyKey = 577;
  static const int dataEnumValueKeyPropertyKey = 578;
  static const int dataEnumValueValuePropertyKey = 579;
  static const int viewModelInstanceBooleanValuePropertyKey = 593;

  static const fieldTypesByHeaderIndex = <int, RiveFieldType>{
    0: RiveFieldType.uint,
    1: RiveFieldType.string,
    2: RiveFieldType.float32,
    3: RiveFieldType.color,
  };

  static const coreTypes = <int, RiveCoreType>{
    artboardTypeKey: RiveCoreType(artboardTypeKey, 'Artboard'),
    componentTypeKey: RiveCoreType(componentTypeKey, 'Component'),
    linearAnimationTypeKey: RiveCoreType(
      linearAnimationTypeKey,
      'LinearAnimation',
    ),
    stateMachineTypeKey: RiveCoreType(stateMachineTypeKey, 'StateMachine'),
    stateMachineNumberTypeKey: RiveCoreType(
      stateMachineNumberTypeKey,
      'StateMachineNumber',
    ),
    stateMachineTriggerTypeKey: RiveCoreType(
      stateMachineTriggerTypeKey,
      'StateMachineTrigger',
    ),
    stateMachineBoolTypeKey: RiveCoreType(
      stateMachineBoolTypeKey,
      'StateMachineBool',
    ),
    fileAssetContentsTypeKey: RiveCoreType(
      fileAssetContentsTypeKey,
      'FileAssetContents',
    ),
    viewModelTypeKey: RiveCoreType(viewModelTypeKey, 'ViewModel'),
    viewModelInstanceTypeKey: RiveCoreType(
      viewModelInstanceTypeKey,
      'ViewModelInstance',
    ),
    viewModelPropertyNumberTypeKey: RiveCoreType(
      viewModelPropertyNumberTypeKey,
      'ViewModelPropertyNumber',
    ),
    viewModelPropertyStringTypeKey: RiveCoreType(
      viewModelPropertyStringTypeKey,
      'ViewModelPropertyString',
    ),
    viewModelPropertyBooleanTypeKey: RiveCoreType(
      viewModelPropertyBooleanTypeKey,
      'ViewModelPropertyBoolean',
    ),
    viewModelPropertyColorTypeKey: RiveCoreType(
      viewModelPropertyColorTypeKey,
      'ViewModelPropertyColor',
    ),
    viewModelPropertyEnumTypeKey: RiveCoreType(
      viewModelPropertyEnumTypeKey,
      'ViewModelPropertyEnum',
    ),
    viewModelPropertyListTypeKey: RiveCoreType(
      viewModelPropertyListTypeKey,
      'ViewModelPropertyList',
    ),
    viewModelPropertyViewModelTypeKey: RiveCoreType(
      viewModelPropertyViewModelTypeKey,
      'ViewModelPropertyViewModel',
    ),
    viewModelInstanceNumberTypeKey: RiveCoreType(
      viewModelInstanceNumberTypeKey,
      'ViewModelInstanceNumber',
    ),
    viewModelInstanceStringTypeKey: RiveCoreType(
      viewModelInstanceStringTypeKey,
      'ViewModelInstanceString',
    ),
    viewModelInstanceBooleanTypeKey: RiveCoreType(
      viewModelInstanceBooleanTypeKey,
      'ViewModelInstanceBoolean',
    ),
    viewModelInstanceColorTypeKey: RiveCoreType(
      viewModelInstanceColorTypeKey,
      'ViewModelInstanceColor',
    ),
    viewModelInstanceEnumTypeKey: RiveCoreType(
      viewModelInstanceEnumTypeKey,
      'ViewModelInstanceEnum',
    ),
    viewModelInstanceListTypeKey: RiveCoreType(
      viewModelInstanceListTypeKey,
      'ViewModelInstanceList',
    ),
    viewModelInstanceViewModelTypeKey: RiveCoreType(
      viewModelInstanceViewModelTypeKey,
      'ViewModelInstanceViewModel',
    ),
    dataEnumTypeKey: RiveCoreType(dataEnumTypeKey, 'DataEnum'),
    dataEnumValueTypeKey: RiveCoreType(dataEnumValueTypeKey, 'DataEnumValue'),
  };

  static const properties = <int, RivePropertyDefinition>{
    componentNamePropertyKey: RivePropertyDefinition(
      'component.name',
      RiveFieldType.string,
    ),
    componentParentIdPropertyKey: RivePropertyDefinition(
      'component.parentId',
      RiveFieldType.uint,
    ),
    artboardDefaultStateMachineIdPropertyKey: RivePropertyDefinition(
      'artboard.defaultStateMachineId',
      RiveFieldType.uint,
    ),
    artboardViewModelIdPropertyKey: RivePropertyDefinition(
      'artboard.viewModelId',
      RiveFieldType.uint,
    ),
    animationNamePropertyKey: RivePropertyDefinition(
      'animation.name',
      RiveFieldType.string,
    ),
    animationFpsPropertyKey: RivePropertyDefinition(
      'linearAnimation.fps',
      RiveFieldType.uint,
    ),
    animationDurationPropertyKey: RivePropertyDefinition(
      'linearAnimation.duration',
      RiveFieldType.uint,
    ),
    animationSpeedPropertyKey: RivePropertyDefinition(
      'linearAnimation.speed',
      RiveFieldType.float32,
    ),
    animationLoopPropertyKey: RivePropertyDefinition(
      'linearAnimation.loop',
      RiveFieldType.uint,
    ),
    stateMachineComponentNamePropertyKey: RivePropertyDefinition(
      'stateMachineComponent.name',
      RiveFieldType.string,
    ),
    stateMachineNumberValuePropertyKey: RivePropertyDefinition(
      'stateMachineNumber.value',
      RiveFieldType.float32,
    ),
    stateMachineBoolValuePropertyKey: RivePropertyDefinition(
      'stateMachineBool.value',
      RiveFieldType.bool,
    ),
    fileAssetContentsBytesPropertyKey: RivePropertyDefinition(
      'fileAssetContents.bytes',
      RiveFieldType.bytes,
    ),
    // Seen in newer files after fileAssetContents.bytes. The generated Rive
    // 0.13.20 schema does not name this field; treat it only as a bytes skip.
    fileAssetContentsUnknown911PropertyKey: RivePropertyDefinition(
      'fileAssetContents.unknown911',
      RiveFieldType.bytes,
    ),
    viewModelComponentNamePropertyKey: RivePropertyDefinition(
      'viewModelComponent.name',
      RiveFieldType.string,
    ),
    viewModelDefaultInstanceIdPropertyKey: RivePropertyDefinition(
      'viewModel.defaultInstanceId',
      RiveFieldType.uint,
    ),
    viewModelInstanceViewModelIdPropertyKey: RivePropertyDefinition(
      'viewModelInstance.viewModelId',
      RiveFieldType.uint,
    ),
    viewModelInstanceValuePropertyIdPropertyKey: RivePropertyDefinition(
      'viewModelInstanceValue.viewModelPropertyId',
      RiveFieldType.uint,
    ),
    viewModelPropertyEnumIdPropertyKey: RivePropertyDefinition(
      'viewModelPropertyEnum.enumId',
      RiveFieldType.uint,
    ),
    viewModelPropertyViewModelReferenceIdPropertyKey: RivePropertyDefinition(
      'viewModelPropertyViewModel.viewModelReferenceId',
      RiveFieldType.uint,
    ),
    viewModelInstanceNumberValuePropertyKey: RivePropertyDefinition(
      'viewModelInstanceNumber.propertyValue',
      RiveFieldType.float32,
    ),
    viewModelInstanceStringValuePropertyKey: RivePropertyDefinition(
      'viewModelInstanceString.propertyValue',
      RiveFieldType.string,
    ),
    viewModelInstanceBooleanValuePropertyKey: RivePropertyDefinition(
      'viewModelInstanceBoolean.propertyValue',
      RiveFieldType.bool,
    ),
    viewModelInstanceColorValuePropertyKey: RivePropertyDefinition(
      'viewModelInstanceColor.propertyValue',
      RiveFieldType.color,
    ),
    viewModelInstanceEnumValuePropertyKey: RivePropertyDefinition(
      'viewModelInstanceEnum.propertyValue',
      RiveFieldType.uint,
    ),
    viewModelInstanceViewModelValuePropertyKey: RivePropertyDefinition(
      'viewModelInstanceViewModel.propertyValue',
      RiveFieldType.uint,
    ),
    dataEnumValueKeyPropertyKey: RivePropertyDefinition(
      'dataEnumValue.key',
      RiveFieldType.string,
    ),
    dataEnumValueValuePropertyKey: RivePropertyDefinition(
      'dataEnumValue.value',
      RiveFieldType.string,
    ),
  };

  // Field-type-only skip map from rive 0.13.20 generated RiveCoreContext.
  // These entries allow safe traversal of records outside the semantic subset.
  static final corePropertyFieldTypes = _buildCorePropertyFieldTypes();

  static Map<int, RiveFieldType> _buildCorePropertyFieldTypes() {
    final types = <int, RiveFieldType>{};
    void addAll(RiveFieldType type, List<int> keys) {
      for (final key in keys) {
        types[key] = type;
      }
    }

    addAll(RiveFieldType.bool, const [
      32,
      41,
      50,
      62,
      94,
      141,
      164,
      174,
      181,
      188,
      189,
      190,
      191,
      192,
      193,
      194,
      196,
      201,
      238,
      245,
      333,
      364,
      365,
      376,
      541,
      547,
      593,
      606,
      634,
      647,
      703,
    ]);
    addAll(RiveFieldType.uint, const [
      5,
      23,
      40,
      48,
      49,
      51,
      53,
      56,
      57,
      59,
      60,
      61,
      67,
      68,
      69,
      92,
      93,
      95,
      102,
      103,
      110,
      111,
      112,
      113,
      117,
      119,
      120,
      121,
      122,
      125,
      128,
      129,
      149,
      151,
      152,
      155,
      156,
      158,
      160,
      165,
      167,
      168,
      171,
      173,
      175,
      178,
      179,
      180,
      195,
      197,
      198,
      204,
      206,
      224,
      225,
      227,
      228,
      236,
      237,
      240,
      249,
      272,
      279,
      281,
      284,
      287,
      289,
      296,
      298,
      301,
      302,
      312,
      313,
      316,
      320,
      325,
      326,
      335,
      349,
      350,
      356,
      357,
      377,
      378,
      389,
      392,
      393,
      399,
      400,
      405,
      408,
      494,
      536,
      537,
      538,
      539,
      546,
      549,
      550,
      551,
      554,
      560,
      564,
      565,
      566,
      574,
      577,
      583,
      586,
      587,
      589,
      590,
      591,
      596,
      597,
      598,
      599,
      600,
      601,
      602,
      603,
      604,
      605,
      607,
      608,
      609,
      610,
      611,
      612,
      613,
      614,
      615,
      616,
      617,
      618,
      619,
      620,
      621,
      622,
      623,
      624,
      625,
      626,
      627,
      628,
      629,
      630,
      631,
      632,
      637,
      648,
      649,
      650,
      653,
      660,
      683,
      685,
    ]);
    addAll(RiveFieldType.color, const [37, 38, 88, 555, 638, 651]);
    addAll(RiveFieldType.string, const [
      4,
      55,
      138,
      203,
      246,
      248,
      268,
      280,
      362,
      557,
      561,
      578,
      579,
      635,
      654,
      662,
    ]);
    addAll(RiveFieldType.float32, const [
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      20,
      21,
      24,
      25,
      26,
      31,
      33,
      34,
      35,
      39,
      42,
      46,
      47,
      58,
      63,
      64,
      65,
      66,
      70,
      79,
      80,
      81,
      82,
      83,
      84,
      85,
      86,
      87,
      89,
      90,
      91,
      96,
      97,
      98,
      99,
      100,
      101,
      104,
      105,
      106,
      107,
      108,
      109,
      114,
      115,
      116,
      123,
      124,
      126,
      127,
      140,
      157,
      161,
      162,
      163,
      166,
      172,
      177,
      182,
      183,
      184,
      185,
      186,
      187,
      199,
      200,
      202,
      207,
      208,
      215,
      216,
      229,
      239,
      243,
      274,
      285,
      286,
      288,
      292,
      297,
      299,
      300,
      303,
      304,
      305,
      306,
      307,
      308,
      317,
      318,
      319,
      321,
      322,
      323,
      324,
      327,
      328,
      329,
      330,
      331,
      332,
      334,
      336,
      337,
      338,
      339,
      340,
      363,
      366,
      367,
      370,
      371,
      372,
      373,
      380,
      381,
      390,
      406,
      407,
      498,
      499,
      500,
      501,
      502,
      503,
      504,
      505,
      506,
      507,
      508,
      509,
      510,
      511,
      512,
      513,
      514,
      515,
      516,
      517,
      518,
      519,
      520,
      521,
      522,
      523,
      524,
      530,
      575,
      592,
      636,
      652,
    ]);
    addAll(RiveFieldType.bytes, const [212, 223, 359, 582, 588]);
    addAll(RiveFieldType.callback, const [395, 401]);
    return types;
  }
}
