import ExpoModulesCore
import Vision

public class FitnessOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FitnessOcr")
    AsyncFunction("recognize") { (uri: String) throws -> String in
      guard let url = URL(string: uri), url.isFileURL else {
        throw NSError(domain: "FitnessOcr", code: 1, userInfo: [NSLocalizedDescriptionKey: "A local image file is required."])
      }
      let request = VNRecognizeTextRequest()
      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = true
      let handler = VNImageRequestHandler(url: url, options: [:])
      try handler.perform([request])
      return (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
    }
  }
}
