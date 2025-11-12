import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UserNotifications

// Custom window class to enable both dev menu and library assistant on shake
class CustomWindow: UIWindow {
    override func motionEnded(_ motion: UIEvent.EventSubtype, with event: UIEvent?) {
        if motion == .motionShake {
            // Post the notification for our custom shake detection
            NotificationCenter.default.post(name: NSNotification.Name("RCTShowDevMenuNotification"), object: nil)
        }
        // Call super to allow React Native's dev menu shake to work
        super.motionEnded(motion, with: event)
    }
}

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = CustomWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "LibraryApp",
      in: window,
      launchOptions: launchOptions
    )

    // Configure push notifications (only if entitlement is available)
    if Bundle.main.object(forInfoDictionaryKey: "aps-environment") != nil {
      self.configurePushNotifications()
    } else {
      print("Push notifications not available - skipping configuration")
    }

    return true
  }

  private func configurePushNotifications() {
    UNUserNotificationCenter.current().delegate = self
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
      print("Permission granted: \(granted)")
      if let error = error {
        print("Error requesting notification permissions: \(error)")
      }
    }
    UIApplication.shared.registerForRemoteNotifications()
  }

  // Handle device token registration (only if push notifications are enabled)
  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    guard Bundle.main.object(forInfoDictionaryKey: "aps-environment") != nil else { return }
    
    let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
    let token = tokenParts.joined()
    print("Device Token: \(token)")

    // Send token to React Native
    NotificationCenter.default.post(name: Notification.Name("RemoteNotificationToken"), object: nil, userInfo: ["token": token])
  }

  // Handle registration error (only if push notifications are enabled)
  func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    guard Bundle.main.object(forInfoDictionaryKey: "aps-environment") != nil else { return }
    
    print("Failed to register for remote notifications: \(error)")
  }

  // Handle notification when app is in foreground (only if push notifications are enabled)
  func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    guard Bundle.main.object(forInfoDictionaryKey: "aps-environment") != nil else { 
      completionHandler([])
      return
    }
    
    completionHandler([.alert, .sound, .badge])
  }

  // Handle notification tap (only if push notifications are enabled)
  func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
    guard Bundle.main.object(forInfoDictionaryKey: "aps-environment") != nil else { 
      completionHandler()
      return
    }
    
    completionHandler()
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
