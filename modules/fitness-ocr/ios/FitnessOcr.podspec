Pod::Spec.new do |s|
  s.name = 'FitnessOcr'
  s.version = '1.0.0'
  s.summary = 'On-device nutrition-label OCR using Apple Vision'
  s.description = 'Local Expo module for recognizing text in captured label images.'
  s.license = { :type => 'Proprietary' }
  s.author = 'Fitness App'
  s.homepage = 'https://docs.expo.dev/modules/'
  s.source = { :git => '' }
  s.platforms = { :ios => '15.5' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Vision', 'ImageIO'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
