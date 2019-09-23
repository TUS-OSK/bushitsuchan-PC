#!/usr/bin/env python3

from typing import List, Dict
from openvino.inference_engine import IENetwork, IECore
import cv2
import numpy as np


class Net:
    def __init__(
        self,
        model_file: str,
        weights_file: str,
        cap: cv2.VideoCapture,
        device: str = "CPU",
        cpu_extension: str = None,
    ) -> None:
        self.cap = cap
        self.device = device  # TODO MYRIAD無いのに指定されたときの処理
        self.ie = IECore()
        self.network = self.get_network(model_file, weights_file, device, cpu_extension)

        self.input_blobs: List[str] = list(self.network.inputs)
        self.out_blob: str = next(iter(self.network.outputs))
        self.network.batch_size = 1

        self.input_shapes: Dict[str, List[int]] = {
            key: value.shape for key, value in self.network.inputs.items()
        }

    def get_network(
        self, model_file: str, weights_file: str, device: str, cpu_extension: str
    ) -> IENetwork:
        if cpu_extension and device == "CPU":
            self.ie.add_extension(cpu_extension, "CPU")

        network = IENetwork(model=model_file, weights=weights_file)

        if "CPU" == device:
            supported_layers = self.ie.query_network(network, "CPU")
            if len(supported_layers) == len(
                network.layers
            ):  # TODO check len(network.layers) return int
                print(
                    "Several layers are not supported by the plugin for specified device."
                )
                print(
                    "Please try to specify cpu extensions library path in sample's command line parameters using -l "
                    "or --cpu_extension command line argument"
                )
                raise

        assert (
            len(network.outputs) == 1
        ), "Sample supports only single output topologies"
        return network

    def __call__():
        raise NotImplementedError


class FasterRCNNResnet101Coco(Net):
    def __init__(self, *args, **kwargs) -> None:
        super(self).__init__(*args, **kwargs)

    def __call__(self):  # TODO return type
        ret, frame = self.cap.read()
        assert ret, f"Can't get image from {self.cap}"  # TODO capのf-string内での表示
        images = np.expand_dims(self.transform(frame), 0)

        output = self.forward(images)
        return output

    @staticmethod
    def transform(x: np.ndarray) -> np.ndarray:
        # TODO RGBの順序 resize
        x = x.transpose((2, 0, 1))

        return x

    def forward(self, x: np.ndarray):  # TODO return type
        exec_net = self.ie.load_network(network=self.network, device_name=self.device)
        inputs = {key: x for key in self.input_blobs}  # TODO x
        output = exec_net.infer(inputs=inputs)[self.out_blob]
        return output
