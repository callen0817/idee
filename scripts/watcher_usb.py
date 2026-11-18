#!/usr/bin/env python3
"""iDee Watcher framed USB serial client (single-owner open/close per call)."""

import argparse
import json
import struct
import sys
import time
import zlib
import serial
import serial.tools.list_ports

MAGIC = b"\xaa\x55ID"
VERSION = 1
MSG_REQ = 0x01
MSG_ACK = 0x02
MSG_NACK = 0x03


def build_frame(seq: int, cmd: str, params: dict | None = None) -> bytes:
    payload = json.dumps({"cmd": cmd, "params": params or {}}, separators=(",", ":")).encode("utf-8")
    hdr_body = struct.pack("<BBHII", VERSION, MSG_REQ, 0, seq, len(payload))
    crc = zlib.crc32(hdr_body + payload) & 0xFFFFFFFF
    return MAGIC + hdr_body + payload + struct.pack("<I", crc)


def read_frame(ser: serial.Serial, timeout_s: float = 6.0) -> dict:
    deadline = time.time() + timeout_s
    ring = bytearray()
    while time.time() < deadline:
        b = ser.read(1)
        if not b:
            continue
        ring.extend(b)
        if len(ring) > 4:
            del ring[0]
        if bytes(ring) == MAGIC:
            hdr = ser.read(12)
            if len(hdr) < 12:
                return {"ok": False, "error": "header_timeout"}
            ver, msg_type, _flags, seq, plen = struct.unpack("<BBHII", hdr)
            if ver != VERSION or plen > 65536:
                return {"ok": False, "error": f"bad_header ver={ver} len={plen}"}
            payload = bytearray()
            while len(payload) < plen and time.time() < deadline:
                chunk = ser.read(plen - len(payload))
                if chunk:
                    payload.extend(chunk)
            if len(payload) != plen:
                return {"ok": False, "error": "payload_timeout"}
            crc_raw = ser.read(4)
            if len(crc_raw) < 4:
                return {"ok": False, "error": "crc_timeout"}
            (rx_crc,) = struct.unpack("<I", crc_raw)
            calc_crc = zlib.crc32(hdr + bytes(payload)) & 0xFFFFFFFF
            if rx_crc != calc_crc:
                return {"ok": False, "error": "crc_mismatch"}
            data = json.loads(bytes(payload).decode("utf-8"))
            data["_msg_type"] = "ACK" if msg_type == MSG_ACK else "NACK"
            data["_seq"] = seq
            return data
    return {"ok": False, "error": "response_timeout"}


def list_ports() -> dict:
    ports = []
    for p in serial.tools.list_ports.comports():
        ports.append({
            "device": p.device,
            "description": p.description,
            "hwid": p.hwid,
            "vid": p.vid,
            "pid": p.pid,
            "serialNumber": p.serial_number,
        })
    return {"ok": True, "ports": ports}


def send_cmd(port: str, baud: int, cmd: str, params: dict | None = None, timeout_s: float = 6.0) -> dict:
    seq = int(time.time() * 1000) & 0xFFFFFFFF
    frame = build_frame(seq, cmd, params)
    ser = serial.Serial()
    ser.port = port
    ser.baudrate = baud
    ser.timeout = 0.2
    ser.dtr = False
    ser.rts = False
    ser.open()
    try:
        ser.reset_input_buffer()
        ser.write(frame)
        ser.flush()
        return read_frame(ser, timeout_s=timeout_s)
    finally:
        ser.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="iDee Watcher USB bridge")
    parser.add_argument(
        "action",
        choices=[
            "ports", "ping", "sys_info", "sscma_info", "hw_test",
            "cam_snapshot", "mic_capture", "sync_push", "sync_pull",
            "set_mode", "enroll_embedding", "recognize_now",
            "record_encounter", "correct_encounter", "delete_audio", "pull_audio",
        ],
    )
    parser.add_argument("--port", default="COM4")
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--params", default="{}")
    parser.add_argument("--timeout", type=float, default=8.0)
    args = parser.parse_args()

    try:
        if args.action == "ports":
            out = list_ports()
        else:
            params = json.loads(args.params)
            out = send_cmd(args.port, args.baud, args.action, params, timeout_s=args.timeout)
    except Exception as exc:
        out = {"ok": False, "error": str(exc)}

    print(json.dumps(out))
    return 0 if out.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
