<center><H1>CV2Midi V2.0 User Manual</H1></center>

<center>Software Version v2.0 Document Updated 2025-10-01</center>


## I. Hardware and Interface Overview

### 1. Interface Configuration

*   **1x Trs Midi Out** (MIDI output connector)
*   **8x CV In** (CV input connectors, 8 channels total)


## II. Hardware Operating Instructions

### 1. Power Connection

The 10-pin power connector is located at the top of the module. When connecting power, ensure that the orientation of the red stripe matches that of the 10-pin gray ribbon cable (the module has built-in reverse-polarity protection, but proper connection is still recommended).

### 2. Power-On Indication

After the module is powered on, the indicator will illuminate for 3 seconds to confirm that the power supply is normal.

### 3. Preset Switching and Indication

The physical button can be used to switch between four preset modes. The current mode is indicated by the LED:

*   Preset 1: LED off
*   Preset 2: LED lit in color 1
*   Preset 3: LED lit in color 2
*   Preset 4: LED lit in color 3


## III. Software Features

The eight CV inputs can convert 0-5V analog signals into eight channels of MIDI messages. All MIDI signals are output through the Trs Midi connector.

Each CV input can be set to one of four types, and the MIDI channel (1-16) can be specified for each CV input:

1. **CONTROL_CHANGE** CC messages
2. **NOTE_NUMBER** Note messages (equivalent to VOCT in the module)
3. **NOTE_ON_OFF** Note on/off messages (equivalent to Gate; controls whether the note you configured is activated)
4. **NOTE_VEL** Note velocity messages (controls the velocity of the note you configured)

To modify your module's mapping configuration for the messages above, use the helper as described in "IV. MIDI Parameter Configuration." You can also ask the seller to assist with configuration at the time of purchase.

**NOTE_NUMBER, NOTE_ON_OFF, and NOTE_VEL** must be associated and bound by setting a third parameter (a number from 0 to 64; identical values are treated as one group of messages). This identifies which NOTE_NUMBER is associated with which NOTE_ON_OFF and NOTE_VEL.

**Input Range**: Supports 0-5V CV signals. A built-in protection circuit applies simple clipping to out-of-range signals (to limit them to the valid range).


## IV. MIDI Parameter Configuration / Customization

Use the "CodingInspireCV2MIDIHelper" editor to configure CV-to-MIDI mappings and upload them to the module.

Download: <a href="https://environscape.github.io/CodingInspire/support/CodingInspireCV2MIDIHelper_v1.0.zip">CodingInspireCV2MIDIHelper_v1.0</a>

##### Instructions for Use:

1. Connect the module to your PC via USB.
2. Select the serial port for your module in the interface (if multiple ports are available, determine which one corresponds to your module), then click "Connect Module."
3. Wait 10 seconds, then press and hold the button for 5 seconds. The module LED will flash, and the mapping information on the module will be sent to the table in the helper interface.
4. The table in the interface contains the configuration information. You can modify your mappings here.
5. Click the "Upload CV Mapping to Module" button.
6. After waiting 10 seconds, disconnect the module's USB connection and prepare to reinstall the module in your rack for use.
