// Transition Settings Component for Control Screen
import React, { useState } from 'react';
import { TransitionSettings } from '../hooks/useTransition';
import { Settings, ToggleLeft, ToggleRight, Sliders, RotateCcw } from 'lucide-react';

interface TransitionControlPanelProps {
  onSettingsChange: (settings: Partial<TransitionSettings> & { 
    transitionsEnabled?: boolean 
  }) => void;
}

const TransitionControlPanel: React.FC<TransitionControlPanelProps> = ({ 
  onSettingsChange 
}) => {
  const [showTransitionSettings, setShowTransitionSettings] = useState(false);
  const [transitionsEnabled, setTransitionsEnabled] = useState(true);
  const [settings, setSettings] = useState<TransitionSettings>({
    gameStart: { enabled: true, duration: 500, type: 'fade', easing: 'ease-in-out' },
    gameEnd: { enabled: true, duration: 500, type: 'fade', easing: 'ease-in-out' },
    stateChange: { enabled: true, duration: 300, type: 'fade', easing: 'ease-in-out' },
    pushToStart: { enabled: true, duration: 300, type: 'fade', easing: 'ease-in-out' }
  });

  const transitionTypes = ['fade', 'slide', 'scale', 'none'] as const;
  const easingTypes = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'] as const;

  const handleGlobalToggle = (enabled: boolean) => {
    setTransitionsEnabled(enabled);
    onSettingsChange({ transitionsEnabled: enabled });
  };

  const handleSettingChange = (
    key: keyof TransitionSettings, 
    property: string, 
    value: any
  ) => {
    const newSettings = {
      ...settings,
      [key]: {
        ...settings[key],
        [property]: value
      }
    };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };
  const resetToDefaults = () => {
    const defaultSettings: TransitionSettings = {
      gameStart: { enabled: true, duration: 500, type: 'fade', easing: 'ease-in-out' },
      gameEnd: { enabled: true, duration: 500, type: 'fade', easing: 'ease-in-out' },
      stateChange: { enabled: true, duration: 300, type: 'fade', easing: 'ease-in-out' },
      pushToStart: { enabled: true, duration: 300, type: 'fade', easing: 'ease-in-out' }
    };
    setSettings(defaultSettings);
    setTransitionsEnabled(true);
    onSettingsChange({ ...defaultSettings, transitionsEnabled: true });
  };

  return (
    <>
      {/* Transition Settings Button */}
      <button
        onClick={() => setShowTransitionSettings(!showTransitionSettings)}
        className="flex items-center space-x-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-md transition-colors"
        title="Transition Settings"
      >
        <Sliders size={20} />
        <span>Transitions</span>
      </button>

      {/* Transition Settings Panel */}
      {showTransitionSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-bold">Transition Settings</h2>
              <button
                onClick={() => setShowTransitionSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Global Toggle */}
            <div className="mb-6 p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Enable All Transitions</span>
                <button
                  onClick={() => handleGlobalToggle(!transitionsEnabled)}
                  className="flex items-center"
                >
                  {transitionsEnabled ? (
                    <ToggleRight size={24} className="text-green-500" />
                  ) : (
                    <ToggleLeft size={24} className="text-gray-500" />
                  )}
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                Globally enable or disable all transition effects
              </p>
            </div>
            {/* Individual Transition Settings */}
            <div className="space-y-4">
              {Object.entries(settings).map(([key, config]) => (
                <div key={key} className="p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h3>
                    <button
                      onClick={() => handleSettingChange(key as keyof TransitionSettings, 'enabled', !config.enabled)}
                      className="flex items-center"
                    >
                      {config.enabled ? (
                        <ToggleRight size={20} className="text-green-500" />
                      ) : (
                        <ToggleLeft size={20} className="text-gray-500" />
                      )}
                    </button>
                  </div>
                  
                  {config.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-gray-400 text-sm">Duration (ms)</label>
                        <input
                          type="number"
                          min="0"
                          max="2000"
                          step="50"
                          value={config.duration}
                          onChange={(e) => handleSettingChange(key as keyof TransitionSettings, 'duration', parseInt(e.target.value))}
                          className="w-full p-2 bg-gray-700 text-white border border-gray-600 rounded"
                        />
                      </div>
                      
                      <div>
                        <label className="text-gray-400 text-sm">Type</label>
                        <select
                          value={config.type}
                          onChange={(e) => handleSettingChange(key as keyof TransitionSettings, 'type', e.target.value)}
                          className="w-full p-2 bg-gray-700 text-white border border-gray-600 rounded"
                        >
                          {transitionTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-gray-400 text-sm">Easing</label>
                        <select
                          value={config.easing}
                          onChange={(e) => handleSettingChange(key as keyof TransitionSettings, 'easing', e.target.value)}
                          className="w-full p-2 bg-gray-700 text-white border border-gray-600 rounded"
                        >
                          {easingTypes.map(easing => (
                            <option key={easing} value={easing}>{easing}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Reset Button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={resetToDefaults}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                <RotateCcw size={16} />
                <span>Reset to Defaults</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TransitionControlPanel;